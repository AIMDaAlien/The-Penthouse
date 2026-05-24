import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, beforeEach, describe, it } from 'node:test';
import { closeDb } from '../src/db/pool.js';
import { pool, registerUser, resetDb, testApp } from './helpers.js';

function trackPoolQueries() {
  const originalQuery = pool.query.bind(pool);
  let count = 0;

  pool.query = ((...args: unknown[]) => {
    count += 1;
    return (originalQuery as (...queryArgs: unknown[]) => unknown)(...args);
  }) as typeof pool.query;

  return {
    get count() {
      return count;
    },
    reset() {
      count = 0;
    },
    restore() {
      pool.query = originalQuery as typeof pool.query;
    }
  };
}

describe('message hydration query budget', () => {
  beforeEach(resetDb);
  after(closeDb);

  it('keeps list and search hydration batched for a full message page', async () => {
    const app = await testApp();
    try {
      const bruce = await registerUser(app, 'hydration-bruce');
      const alfred = await registerUser(app, 'hydration-alfred');
      const headers = { authorization: `Bearer ${bruce.accessToken}` };
      const chats = await app.inject({ method: 'GET', url: '/api/v1/chats', headers });
      assert.equal(chats.statusCode, 200, chats.body);
      const chat = (chats.json() as { chats: Array<{ id: string }> }).chats[0];

      const mediaId = randomUUID();
      await pool.query(`
        INSERT INTO media_uploads (id, uploader_id, file_name, original_file_name, storage_key, size_bytes, content_type, media_kind, scope)
        VALUES ($1, $2, 'briefing.png', 'briefing.png', $3, 512, 'image/png', 'image', 'private')
      `, [mediaId, bruce.user.id, `test/${mediaId}.png`]);

      const messageIds = Array.from({ length: 50 }, () => randomUUID());
      const messageValues: unknown[] = [];
      const messagePlaceholders = messageIds.map((id, index) => {
        const offset = index * 7;
        messageValues.push(
          id,
          chat.id,
          bruce.user.id,
          `needle briefing ${index}`,
          `hydration-budget-${index}`,
          JSON.stringify({ imageUrl: `/api/v1/media/${mediaId}` }),
          index
        );
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, 'image', $${offset + 6}::jsonb, now() - ($${offset + 7}::int * interval '1 second'))`;
      }).join(', ');

      await pool.query(`
        INSERT INTO messages (id, chat_id, sender_id, content, client_message_id, message_type, metadata, created_at)
        VALUES ${messagePlaceholders}
      `, messageValues);

      await pool.query(`
        INSERT INTO message_edits (message_id, previous_content, edited_by)
        SELECT id, 'before edit', sender_id
        FROM messages
        WHERE id = ANY($1::uuid[])
      `, [messageIds.slice(0, 10)]);

      await pool.query(`
        INSERT INTO message_reactions (message_id, user_id, emoji)
        SELECT id, $2, 'ok'
        FROM messages
        WHERE id = ANY($1::uuid[])
      `, [messageIds.slice(0, 10), alfred.user.id]);

      await pool.query(`
        UPDATE chat_members
        SET last_read_message_id = $1, last_read_at = now()
        WHERE chat_id = $2 AND user_id = $3
      `, [messageIds[0], chat.id, alfred.user.id]);

      const tracker = trackPoolQueries();
      try {
        const list = await app.inject({ method: 'GET', url: `/api/v1/chats/${chat.id}/messages`, headers });
        assert.equal(list.statusCode, 200, list.body);
        assert.equal((list.json() as { messages: unknown[] }).messages.length, 50);
        assert.ok(
          tracker.count <= 11,
          `expected list hydration to stay batched at <= 11 SQL calls, got ${tracker.count}`
        );

        tracker.reset();
        const search = await app.inject({
          method: 'GET',
          url: `/api/v1/chats/${chat.id}/messages/search?q=needle`,
          headers
        });
        assert.equal(search.statusCode, 200, search.body);
        assert.equal((search.json() as { messages: unknown[] }).messages.length, 50);
        assert.ok(
          tracker.count <= 11,
          `expected search hydration to stay batched at <= 11 SQL calls, got ${tracker.count}`
        );
      } finally {
        tracker.restore();
      }
    } finally {
      await app.close();
    }
  });

  it('keeps chat message search backed by the trigram index', async () => {
    const extension = await pool.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1
        FROM pg_extension
        WHERE extname = 'pg_trgm'
      ) AS exists
    `);
    assert.equal(extension.rows[0]?.exists, true, 'pg_trgm extension should be installed');

    const index = await pool.query<{ definition: string }>(`
      SELECT indexdef AS definition
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'messages'
        AND indexname = 'idx_messages_content_trgm'
    `);
    assert.match(
      index.rows[0]?.definition ?? '',
      /USING gin \(content gin_trgm_ops\)/,
      'messages.content should have a trigram GIN index for ILIKE search'
    );
  });
});
