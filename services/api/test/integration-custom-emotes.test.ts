import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { closeDb, pool } from '../src/db/pool.js';
import { registerUser, resetDb, testApp } from './helpers.js';

async function insertImageUpload(userId: string) {
  const result = await pool.query<{ id: string }>(`
    INSERT INTO media_uploads
      (uploader_id, file_name, original_file_name, storage_key, size_bytes, content_type, media_kind)
    VALUES
      ($1, gen_random_uuid()::text || '.png', 'sticker.png', gen_random_uuid()::text || '.png', 128, 'image/png', 'image')
    RETURNING id
  `, [userId]);
  return result.rows[0].id;
}

describe('custom emotes and stickers integration', () => {
  beforeEach(resetDb);
  after(closeDb);

  it('requires owned image uploads for emotes and stickers', async () => {
    const app = await testApp();
    try {
      const alfred = await registerUser(app, 'alfred');
      const bruce = await registerUser(app, 'bruce');
      const selina = await registerUser(app, 'selina');
      const bruceHeaders = { authorization: `Bearer ${bruce.accessToken}` };
      const alfredUploadId = await insertImageUpload(alfred.user.id);
      const bruceUploadId = await insertImageUpload(bruce.user.id);

      const stolenEmote = await app.inject({
        method: 'POST',
        url: '/api/v1/emotes',
        headers: bruceHeaders,
        payload: { name: 'stolen', mediaUploadId: alfredUploadId }
      });
      assert.equal(stolenEmote.statusCode, 403, stolenEmote.body);

      const emote = await app.inject({
        method: 'POST',
        url: '/api/v1/emotes',
        headers: bruceHeaders,
        payload: { name: 'bat_signal', mediaUploadId: bruceUploadId }
      });
      assert.equal(emote.statusCode, 200, emote.body);

      const pack = await app.inject({
        method: 'POST',
        url: '/api/v1/sticker-packs',
        headers: bruceHeaders,
        payload: { name: 'Cave' }
      });
      assert.equal(pack.statusCode, 200, pack.body);
      const packId = (pack.json() as { pack: { id: string } }).pack.id;

      const stolenSticker = await app.inject({
        method: 'POST',
        url: `/api/v1/sticker-packs/${packId}/stickers`,
        headers: bruceHeaders,
        payload: { name: 'stolen', mediaUploadId: alfredUploadId }
      });
      assert.equal(stolenSticker.statusCode, 403, stolenSticker.body);

      const sticker = await app.inject({
        method: 'POST',
        url: `/api/v1/sticker-packs/${packId}/stickers`,
        headers: bruceHeaders,
        payload: { name: 'bat', mediaUploadId: bruceUploadId }
      });
      assert.equal(sticker.statusCode, 200, sticker.body);

      const privatePackStickers = await app.inject({
        method: 'GET',
        url: `/api/v1/sticker-packs/${packId}/stickers`,
        headers: { authorization: `Bearer ${selina.accessToken}` }
      });
      assert.equal(privatePackStickers.statusCode, 403, privatePackStickers.body);
    } finally {
      await app.close();
    }
  });
});
