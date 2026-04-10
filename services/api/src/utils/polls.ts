import { randomUUID } from 'node:crypto';
import { PollDataSchema, type PollData } from '@penthouse/contracts';
import type { Queryable } from './users.js';

type PollRow = {
  id: string;
  chat_id: string;
  message_id: string;
  created_by_user_id: string;
  question: string;
  multi_select: boolean;
  expires_at: string | Date | null;
};

type PollOptionRow = {
  id: string;
  option_index: number;
  option_text: string;
};

type PollVoteRow = {
  option_id: string;
  user_id: string;
};

async function loadPollRow(db: Queryable, pollId: string): Promise<PollRow | null> {
  const result = await db.query(
    `SELECT id, chat_id, message_id, created_by_user_id, question, multi_select, expires_at
     FROM polls
     WHERE id = $1`,
    [pollId]
  );

  return (result.rows[0] as PollRow | undefined) ?? null;
}

export async function loadPollData(db: Queryable, pollId: string): Promise<PollData | null> {
  const poll = await loadPollRow(db, pollId);
  if (!poll) return null;

  const optionsResult = await db.query(
    `SELECT id, option_index, option_text
     FROM poll_options
     WHERE poll_id = $1
     ORDER BY option_index ASC`,
    [pollId]
  );
  const votesResult = await db.query(
    `SELECT option_id, user_id
     FROM poll_votes
     WHERE poll_id = $1`,
    [pollId]
  );

  const votesByOptionId = new Map<string, string[]>();
  for (const row of votesResult.rows as PollVoteRow[]) {
    const voters = votesByOptionId.get(row.option_id) ?? [];
    voters.push(row.user_id);
    votesByOptionId.set(row.option_id, voters);
  }

  return PollDataSchema.parse({
    id: poll.id,
    question: poll.question,
    options: (optionsResult.rows as PollOptionRow[]).map((option) => ({
      text: option.option_text,
      voterIds: votesByOptionId.get(option.id) ?? []
    })),
    ...(poll.multi_select ? { multiSelect: true } : {}),
    expiresAt: poll.expires_at ? new Date(poll.expires_at).toISOString() : null,
    createdByUserId: poll.created_by_user_id
  });
}

export async function createPollRecords(
  db: Queryable,
  input: {
    chatId: string;
    messageId: string;
    createdByUserId: string;
    question: string;
    options: string[];
    multiSelect?: boolean;
    expiresAt?: string;
  }
): Promise<PollData> {
  const pollId = randomUUID();
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

  await db.query(
    `INSERT INTO polls(id, chat_id, message_id, created_by_user_id, question, multi_select, expires_at)
     VALUES($1, $2, $3, $4, $5, $6, $7)`,
    [
      pollId,
      input.chatId,
      input.messageId,
      input.createdByUserId,
      input.question,
      Boolean(input.multiSelect),
      expiresAt
    ]
  );

  for (const [optionIndex, optionText] of input.options.entries()) {
    await db.query(
      `INSERT INTO poll_options(id, poll_id, option_index, option_text)
       VALUES($1, $2, $3, $4)`,
      [randomUUID(), pollId, optionIndex, optionText]
    );
  }

  const poll = await loadPollData(db, pollId);
  if (!poll) {
    throw new Error('Failed to load created poll');
  }
  return poll;
}

export async function loadPollVoteContext(
  db: Queryable,
  pollId: string,
  userId: string
): Promise<{
  found: boolean;
  isMember: boolean;
  chatId: string;
  multiSelect: boolean;
  expiresAt: string | Date | null;
  optionIdsByIndex: Map<number, string>;
  existingOptionIds: string[];
} | null> {
  const pollResult = await db.query(
    `SELECT id, chat_id, message_id, created_by_user_id, question, multi_select, expires_at
     FROM polls
     WHERE id = $1
     FOR UPDATE`,
    [pollId]
  );
  const poll = (pollResult.rows[0] as PollRow | undefined) ?? null;
  if (!poll) {
    return null;
  }

  const membershipResult = await db.query(
    `SELECT 1
     FROM chat_members
     WHERE chat_id = $1 AND user_id = $2`,
    [poll.chat_id, userId]
  );
  const optionsResult = await db.query(
    `SELECT id, option_index, option_text
     FROM poll_options
     WHERE poll_id = $1
     ORDER BY option_index ASC`,
    [pollId]
  );
  const existingVotesResult = await db.query(
    `SELECT option_id, user_id
     FROM poll_votes
     WHERE poll_id = $1 AND user_id = $2`,
    [pollId, userId]
  );

  if (!membershipResult.rowCount) {
    return {
      found: true,
      isMember: false,
      chatId: poll.chat_id,
      multiSelect: poll.multi_select,
      expiresAt: poll.expires_at,
      optionIdsByIndex: new Map(),
      existingOptionIds: []
    };
  }

  return {
    found: true,
    isMember: true,
    chatId: poll.chat_id,
    multiSelect: poll.multi_select,
    expiresAt: poll.expires_at,
    optionIdsByIndex: new Map(
      (optionsResult.rows as PollOptionRow[]).map((row) => [row.option_index, row.id])
    ),
    existingOptionIds: (existingVotesResult.rows as PollVoteRow[]).map((row) => row.option_id)
  };
}

export async function recordPollVote(
  db: Queryable,
  input: {
    pollId: string;
    userId: string;
    optionId: string;
    multiSelect: boolean;
    existingOptionIds: string[];
  }
): Promise<{ poll: PollData; changed: boolean }> {
  let changed = false;

  if (!input.multiSelect && input.existingOptionIds.length > 0) {
    if (input.existingOptionIds.includes(input.optionId)) {
      const poll = await loadPollData(db, input.pollId);
      if (!poll) throw new Error('Poll not found after vote check');
      return { poll, changed: false };
    }
    throw new Error('You have already voted on this poll');
  }

  const result = await db.query(
    `INSERT INTO poll_votes(poll_id, option_id, user_id)
     VALUES($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [input.pollId, input.optionId, input.userId]
  );
  changed = Boolean(result.rowCount);

  const poll = await loadPollData(db, input.pollId);
  if (!poll) {
    throw new Error('Poll not found after vote');
  }

  return { poll, changed };
}
