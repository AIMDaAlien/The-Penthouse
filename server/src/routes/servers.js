const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { validateCreateServer, validateCreateChannel } = require('../middleware/validation');

const router = express.Router();
const toInt = (v) => {
    const n = Number.parseInt(v, 10);
    return Number.isInteger(n) && n > 0 ? n : null;
};
const requireServerMembership = (serverId, userId) => {
    const membership = db.prepare('SELECT 1 FROM server_members WHERE server_id = ? AND user_id = ?')
        .get(serverId, userId);
    return !!membership;
};
const requireServerOwner = (serverId, userId) => {
    const server = db.prepare('SELECT owner_id FROM servers WHERE id = ?').get(serverId);
    if (!server) return { ok: false, status: 404, error: 'Server not found' };
    if (server.owner_id !== userId) return { ok: false, status: 403, error: 'Only the server owner can do that' };
    return { ok: true, server };
};

// Get all servers user is member of
router.get('/', authenticateToken, (req, res) => {
    try {
        const servers = db.prepare(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM server_members WHERE server_id = s.id) as member_count
      FROM servers s
      INNER JOIN server_members sm ON s.id = sm.server_id
      WHERE sm.user_id = ?
      ORDER BY s.created_at DESC
    `).all(req.user.userId);

        res.json(servers.map(s => ({
            id: s.id,
            name: s.name,
            iconUrl: s.icon_url,
            ownerId: s.owner_id,
            memberCount: s.member_count
        })));
    } catch (err) {
        console.error('Get servers error:', err);
        res.status(500).json({ error: 'Failed to get servers' });
    }
});

// Create a new server
router.post('/', authenticateToken, validateCreateServer, (req, res) => {
    try {
        const { name, iconUrl } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Server name is required' });
        }

        // Create server
        const result = db.prepare(
            'INSERT INTO servers (name, icon_url, owner_id) VALUES (?, ?, ?)'
        ).run(name, iconUrl || null, req.user.userId);

        const serverId = result.lastInsertRowid;

        // Add owner as member
        db.prepare(
            'INSERT INTO server_members (server_id, user_id) VALUES (?, ?)'
        ).run(serverId, req.user.userId);

        // Create default "general" channel
        db.prepare(
            'INSERT INTO chats (name, type, server_id, created_by) VALUES (?, ?, ?, ?)'
        ).run('general', 'channel', serverId, req.user.userId);

        res.status(201).json({
            id: serverId,
            name,
            iconUrl,
            ownerId: req.user.userId
        });
    } catch (err) {
        console.error('Create server error:', err);
        res.status(500).json({ error: 'Failed to create server' });
    }
});

// Get server details and channels
router.get('/:serverId', authenticateToken, (req, res) => {
    try {
        const { serverId } = req.params;

        // Verify membership
        const membership = db.prepare(
            'SELECT * FROM server_members WHERE server_id = ? AND user_id = ?'
        ).get(serverId, req.user.userId);

        if (!membership) {
            return res.status(403).json({ error: 'Not a member of this server' });
        }

        const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId);

        // Get channels for this server
        const channels = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) 
         FROM messages m 
         LEFT JOIN read_receipts rr ON rr.message_id = m.id AND rr.user_id = ? 
         WHERE m.chat_id = c.id 
         AND m.user_id != ? 
         AND rr.id IS NULL) as unread_count
      FROM chats c
      WHERE c.server_id = ? AND c.type = 'channel'
      ORDER BY c.created_at ASC
    `).all(req.user.userId, req.user.userId, serverId);

        // Get members
        const members = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar_url, sm.joined_at
      FROM server_members sm
      INNER JOIN users u ON sm.user_id = u.id
      WHERE sm.server_id = ?
    `).all(serverId);

        res.json({
            id: server.id,
            name: server.name,
            iconUrl: server.icon_url,
            ownerId: server.owner_id,
            channels: channels.map(c => ({
                id: c.id,
                name: c.name,
                type: c.type,
                serverId: c.server_id,
                unreadCount: c.unread_count || 0
            })),
            members: members.map(m => ({
                id: m.id,
                username: m.username,
                displayName: m.display_name,
                avatarUrl: m.avatar_url
            }))
        });
    } catch (err) {
        console.error('Get server details error:', err);
        res.status(500).json({ error: 'Failed to get server details' });
    }
});

// Create channel in server
router.post('/:serverId/channels', authenticateToken, validateCreateChannel, (req, res) => {
    try {
        const { serverId } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Channel name is required' });
        }

        // Verify membership
        const membership = db.prepare(
            'SELECT * FROM server_members WHERE server_id = ? AND user_id = ?'
        ).get(serverId, req.user.userId);

        if (!membership) {
            return res.status(403).json({ error: 'Not a member of this server' });
        }

        const result = db.prepare(
            'INSERT INTO chats (name, type, server_id, created_by) VALUES (?, ?, ?, ?)'
        ).run(name, 'channel', serverId, req.user.userId);

        res.status(201).json({
            id: result.lastInsertRowid,
            name,
            type: 'channel',
            serverId: parseInt(serverId)
        });
    } catch (err) {
        console.error('Create channel error:', err);
        res.status(500).json({ error: 'Failed to create channel' });
    }
});

// Update channel name in server (owner only)
router.put('/:serverId/channels/:channelId', authenticateToken, validateCreateChannel, (req, res) => {
    try {
        const serverId = toInt(req.params.serverId);
        const channelId = toInt(req.params.channelId);
        const { name } = req.body;
        if (!serverId || !channelId) return res.status(400).json({ error: 'Invalid server/channel id' });

        const ownerCheck = requireServerOwner(serverId, req.user.userId);
        if (!ownerCheck.ok) return res.status(ownerCheck.status).json({ error: ownerCheck.error });

        const channel = db.prepare('SELECT id, name, type, server_id FROM chats WHERE id = ?').get(channelId);
        if (!channel || channel.type !== 'channel' || channel.server_id !== serverId) {
            return res.status(404).json({ error: 'Channel not found' });
        }

        db.prepare('UPDATE chats SET name = ? WHERE id = ?').run(name, channelId);
        res.json({ success: true, id: channelId, name });
    } catch (err) {
        console.error('Update channel error:', err);
        res.status(500).json({ error: 'Failed to update channel' });
    }
});

// Delete channel in server (owner only)
router.delete('/:serverId/channels/:channelId', authenticateToken, (req, res) => {
    try {
        const serverId = toInt(req.params.serverId);
        const channelId = toInt(req.params.channelId);
        if (!serverId || !channelId) return res.status(400).json({ error: 'Invalid server/channel id' });

        const ownerCheck = requireServerOwner(serverId, req.user.userId);
        if (!ownerCheck.ok) return res.status(ownerCheck.status).json({ error: ownerCheck.error });

        const channel = db.prepare('SELECT id, name, type, server_id FROM chats WHERE id = ?').get(channelId);
        if (!channel || channel.type !== 'channel' || channel.server_id !== serverId) {
            return res.status(404).json({ error: 'Channel not found' });
        }
        if (channel.name === 'general') {
            return res.status(400).json({ error: 'Cannot delete the general channel' });
        }

        // Ensure at least one channel remains
        const channelCount = db.prepare('SELECT COUNT(*) as c FROM chats WHERE server_id = ? AND type = ?').get(serverId, 'channel');
        if (channelCount && channelCount.c <= 1) {
            return res.status(400).json({ error: 'Cannot delete the last channel' });
        }

        db.prepare('DELETE FROM chats WHERE id = ?').run(channelId);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete channel error:', err);
        res.status(500).json({ error: 'Failed to delete channel' });
    }
});

// Leave server (member only; owner must transfer first)
router.post('/:serverId/leave', authenticateToken, (req, res) => {
    try {
        const serverId = toInt(req.params.serverId);
        if (!serverId) return res.status(400).json({ error: 'Invalid server id' });

        const server = db.prepare('SELECT owner_id FROM servers WHERE id = ?').get(serverId);
        if (!server) return res.status(404).json({ error: 'Server not found' });
        if (!requireServerMembership(serverId, req.user.userId)) {
            return res.status(403).json({ error: 'Not a member of this server' });
        }
        if (server.owner_id === req.user.userId) {
            return res.status(400).json({ error: 'Owner cannot leave server. Transfer ownership or delete the server.' });
        }

        db.prepare('DELETE FROM server_members WHERE server_id = ? AND user_id = ?').run(serverId, req.user.userId);
        res.json({ success: true });
    } catch (err) {
        console.error('Leave server error:', err);
        res.status(500).json({ error: 'Failed to leave server' });
    }
});

// Remove member (kick). Owner can remove anyone except self; member can remove self (leave).
router.delete('/:serverId/members/:userId', authenticateToken, (req, res) => {
    try {
        const serverId = toInt(req.params.serverId);
        const targetUserId = toInt(req.params.userId);
        if (!serverId || !targetUserId) return res.status(400).json({ error: 'Invalid server/user id' });

        const server = db.prepare('SELECT owner_id FROM servers WHERE id = ?').get(serverId);
        if (!server) return res.status(404).json({ error: 'Server not found' });

        const requesterId = req.user.userId;
        const isOwner = server.owner_id === requesterId;
        const isSelf = requesterId === targetUserId;

        if (!isOwner && !isSelf) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (isSelf && isOwner) {
            return res.status(400).json({ error: 'Owner cannot remove self. Transfer ownership or delete the server.' });
        }
        if (targetUserId === server.owner_id) {
            return res.status(400).json({ error: 'Cannot remove the server owner' });
        }

        const result = db.prepare('DELETE FROM server_members WHERE server_id = ? AND user_id = ?').run(serverId, targetUserId);
        if (!result || result.changes === 0) return res.status(404).json({ error: 'User is not a member of this server' });

        res.json({ success: true });
    } catch (err) {
        console.error('Remove member error:', err);
        res.status(500).json({ error: 'Failed to remove member' });
    }
});

// Transfer ownership to another member (owner only)
router.post('/:serverId/transfer/:userId', authenticateToken, (req, res) => {
    try {
        const serverId = toInt(req.params.serverId);
        const newOwnerId = toInt(req.params.userId);
        if (!serverId || !newOwnerId) return res.status(400).json({ error: 'Invalid server/user id' });

        const ownerCheck = requireServerOwner(serverId, req.user.userId);
        if (!ownerCheck.ok) return res.status(ownerCheck.status).json({ error: ownerCheck.error });

        if (!requireServerMembership(serverId, newOwnerId)) {
            return res.status(400).json({ error: 'New owner must be a member of the server' });
        }

        db.prepare('UPDATE servers SET owner_id = ? WHERE id = ?').run(newOwnerId, serverId);
        res.json({ success: true, ownerId: newOwnerId });
    } catch (err) {
        console.error('Transfer ownership error:', err);
        res.status(500).json({ error: 'Failed to transfer ownership' });
    }
});

// Delete server (owner only)
router.delete('/:serverId', authenticateToken, (req, res) => {
    try {
        const serverId = toInt(req.params.serverId);
        if (!serverId) return res.status(400).json({ error: 'Invalid server id' });

        const ownerCheck = requireServerOwner(serverId, req.user.userId);
        if (!ownerCheck.ok) return res.status(ownerCheck.status).json({ error: ownerCheck.error });

        db.prepare('DELETE FROM servers WHERE id = ?').run(serverId);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete server error:', err);
        res.status(500).json({ error: 'Failed to delete server' });
    }
});

module.exports = router;
