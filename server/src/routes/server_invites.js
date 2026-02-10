const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');

// Generate a random invite code
const generateCode = () => {
    return crypto.randomBytes(4).toString('hex').substring(0, 8);
};

// Get invite info (public)
router.get('/:code', (req, res) => {
    try {
        const { code } = req.params;
        const invite = db.prepare(`
            SELECT i.*, s.name as server_name,
              (SELECT COUNT(*) FROM server_members WHERE server_id = s.id) as member_count
            FROM server_invites i
            JOIN servers s ON i.server_id = s.id
            WHERE i.code = ?
        `).get(code);

        if (!invite) {
            return res.status(404).json({ error: 'Invite not found' });
        }

        res.json({
            code: invite.code,
            serverName: invite.server_name,
            memberCount: invite.member_count,
            uses: invite.uses,
            maxUses: invite.max_uses
        });
    } catch (err) {
        console.error('Get invite error:', err);
        res.status(500).json({ error: 'Failed to get invite info' });
    }
});

// Create an invite for a server
router.post('/server/:serverId', authenticateToken, (req, res) => {
    try {
        const { serverId } = req.params;
        const userId = req.user.userId;
        const { maxUses } = req.body;

        // Verify user is a member of the server
        const member = db.prepare('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?')
            .get(serverId, userId);

        if (!member) {
            return res.status(403).json({ error: 'You are not a member of this server' });
        }

        const code = generateCode();

        db.prepare(`
            INSERT INTO server_invites (server_id, code, created_by, max_uses)
            VALUES (?, ?, ?, ?)
        `).run(serverId, code, userId, maxUses || null);

        res.json({ success: true, code });
    } catch (err) {
        console.error('Create invite error:', err);
        res.status(500).json({ error: 'Failed to create invite' });
    }
});

// Join server using invite
router.post('/:code/join', authenticateToken, (req, res) => {
    try {
        const { code } = req.params;
        const userId = req.user.userId;

        const invite = db.prepare('SELECT * FROM server_invites WHERE code = ?').get(code);
        if (!invite) {
            return res.status(404).json({ error: 'Invite not found' });
        }

        // Check if user is already a member
        const existingMember = db.prepare('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?')
            .get(invite.server_id, userId);

        if (existingMember) {
            return res.json({ success: true, alreadyMember: true, serverId: invite.server_id });
        }

        // Add user to server
        db.prepare('INSERT INTO server_members (server_id, user_id) VALUES (?, ?)')
            .run(invite.server_id, userId);

        // Update invite uses
        db.prepare('UPDATE server_invites SET uses = uses + 1 WHERE id = ?')
            .run(invite.id);

        // Get the General channel to return for redirection
        const generalChannel = db.prepare(`
            SELECT id FROM chats 
            WHERE server_id = ? AND name = 'general' AND type = 'channel'
        `).get(invite.server_id);

        res.json({
            success: true,
            serverId: invite.server_id,
            channelId: generalChannel ? generalChannel.id : null
        });
    } catch (err) {
        console.error('Join invite error:', err);
        res.status(500).json({ error: 'Failed to join server' });
    }
});

module.exports = router;
