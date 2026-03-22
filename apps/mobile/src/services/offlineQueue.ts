import type { PendingMessage } from '../types';

const KEY = 'penthouse.pendingMessages';
export type FlushQueueResult = 'delivered' | 'keep';

function storageKey(scopeKey: string): string {
  return `${KEY}:${scopeKey}`;
}

function readQueue(scopeKey: string): PendingMessage[] {
  const key = storageKey(scopeKey);

  const raw = localStorage.getItem(key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Array<Partial<PendingMessage>>;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is Partial<PendingMessage> & { chatId: string; content: string; clientMessageId: string; enqueuedAt: string } =>
        Boolean(
          item &&
          typeof item.chatId === 'string' &&
          typeof item.content === 'string' &&
          typeof item.clientMessageId === 'string' &&
          typeof item.enqueuedAt === 'string'
        )
      )
      .map((item) => ({
        chatId: item.chatId,
        content: item.content,
        type: item.type ?? 'text',
        metadata: item.metadata ?? null,
        clientMessageId: item.clientMessageId,
        enqueuedAt: item.enqueuedAt,
        attempts: typeof item.attempts === 'number' ? item.attempts : 0
      }));
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingMessage[], scopeKey: string): void {
  const key = storageKey(scopeKey);

  if (queue.length === 0) {
    localStorage.removeItem(key);
    return;
  }

  localStorage.setItem(key, JSON.stringify(queue));
}

export function enqueueMessage(item: PendingMessage, scopeKey: string): void {
  const queue = readQueue(scopeKey);
  queue.push(item);
  writeQueue(queue, scopeKey);
}

export function removeQueued(clientMessageId: string, scopeKey: string): void {
  writeQueue(
    readQueue(scopeKey).filter((item) => item.clientMessageId !== clientMessageId),
    scopeKey
  );
}

export function getQueued(scopeKey: string): PendingMessage[] {
  return readQueue(scopeKey);
}

export function clearQueued(scopeKey: string): void {
  writeQueue([], scopeKey);
}

export async function flushQueue(
  sender: (item: PendingMessage) => Promise<FlushQueueResult>,
  scopeKey: string,
  onAttempt?: (item: PendingMessage) => void
): Promise<void> {
  const queue = readQueue(scopeKey);
  for (const item of queue) {
    onAttempt?.(item);
    try {
      const result = await sender(item);
      if (result === 'delivered') {
        removeQueued(item.clientMessageId, scopeKey);
      }
    } catch {
      // Leave in queue for next flush attempt; continue with remaining items
    }
  }
}
