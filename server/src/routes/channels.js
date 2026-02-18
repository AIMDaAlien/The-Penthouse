const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { validateCreateChannel } = require('../middleware/validation');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const toInt = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const requireServerOwner = (serverId, userId) => {
  const server = db.prepare('SELECT owner_id FROM servers WHERE id = ?').get(serverId);
  if (!server) return { ok: false, status: 404, error: 'Server not found' };
  if (server.owner_id !== userId) return { ok: false, status: 403, error: 'Only the server owner can do that' };
  return { ok: true };
};

// Update channel (legacy-compatible path used by mobile)
router.put('/:channelId', authenticateToken, validateCreateChannel, asyncHandler(async (req, res) => {
  const channelId = toInt(req.params.channelId);
  if (!channelId) return res.status(400).json({ error: 'Invalid channel id' });

  const channel = db.prepare('SELECT id, name, type, server_id FROM chats WHERE id = ?').get(channelId);
  if (!channel || channel.type !== 'channel' || !channel.server_id) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const ownerCheck = requireServerOwner(channel.server_id, req.user.userId);
  if (!ownerCheck.ok) return res.status(ownerCheck.status).json({ error: ownerCheck.error });

  db.prepare('UPDATE chats SET name = ? WHERE id = ?').run(req.body.name, channelId);
  res.json({ success: true, id: channelId, name: req.body.name });
}));

// Delete channel (legacy-compatible path used by mobile)
router.delete('/:channelId', authenticateToken, asyncHandler(async (req, res) => {
  const channelId = toInt(req.params.channelId);
  if (!channelId) return res.status(400).json({ error: 'Invalid channel id' });

  const channel = db.prepare('SELECT id, name, type, server_id FROM chats WHERE id = ?').get(channelId);
  if (!channel || channel.type !== 'channel' || !channel.server_id) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const ownerCheck = requireServerOwner(channel.server_id, req.user.userId);
  if (!ownerCheck.ok) return res.status(ownerCheck.status).json({ error: ownerCheck.error });

  if (channel.name === 'general') {
    return res.status(400).json({ error: 'Cannot delete the general channel' });
  }

  const channelCount = db.prepare('SELECT COUNT(*) as c FROM chats WHERE server_id = ? AND type = ?')
    .get(channel.server_id, 'channel');
  if (channelCount && channelCount.c <= 1) {
    return res.status(400).json({ error: 'Cannot delete the last channel' });
  }

  db.prepare('DELETE FROM chats WHERE id = ?').run(channelId);
  res.json({ success: true });
}));

module.exports = router;

