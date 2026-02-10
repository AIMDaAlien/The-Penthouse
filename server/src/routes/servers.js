const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { validateCreateServer, validateCreateChannel } = require('../middleware/validation');

const router = express.Router();

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
router.post('/', authenticateToken, (req, res) => {
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
      SELECT * FROM chats 
      WHERE server_id = ? AND type = 'channel'
      ORDER BY created_at ASC
    `).all(serverId);

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
                serverId: c.server_id
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
router.post('/:serverId/channels', authenticateToken, (req, res) => {
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

module.exports = router;
