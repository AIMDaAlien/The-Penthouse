const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');

// Generate a random invite code
const generateCode = () => {
    return crypto.randomBytes(4).toString('hex').substring(0, 8);
};

// Get invite info (public)
router.get('/:code', asyncHandler(async (req, res) => {
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
}));

// Create an invite for a server
router.post('/server/:serverId', authenticateToken, asyncHandler(async (req, res) => {
    const { serverId } = req.params;
    const userId = req.user.userId;
    const parsedMaxUses = Number(req.body.maxUses);
    const maxUses = Number.isFinite(parsedMaxUses) && parsedMaxUses > 0
        ? Math.floor(parsedMaxUses)
        : null;

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
        `).run(serverId, code, userId, maxUses);

    res.json({ success: true, code });
}));

// Join server using invite
router.post('/:code/join', authenticateToken, asyncHandler(async (req, res) => {
    const { code } = req.params;
    const userId = req.user.userId;
    let invite;
    let alreadyMember = false;

    try {
        db.exec('BEGIN IMMEDIATE');

        invite = db.prepare('SELECT * FROM server_invites WHERE code = ?').get(code);
        if (!invite) {
            db.exec('ROLLBACK');
            return res.status(404).json({ error: 'Invite not found' });
        }

        if (invite.max_uses !== null && invite.uses >= invite.max_uses) {
            db.exec('ROLLBACK');
            return res.status(410).json({ error: 'Invite has reached max uses' });
        }

        // Check if user is already a member
        const existingMember = db.prepare('SELECT * FROM server_members WHERE server_id = ? AND user_id = ?')
            .get(invite.server_id, userId);

        if (existingMember) {
            alreadyMember = true;
        } else {
            // Add user to server
            db.prepare('INSERT INTO server_members (server_id, user_id) VALUES (?, ?)')
                .run(invite.server_id, userId);

            // Update invite uses
            db.prepare('UPDATE server_invites SET uses = uses + 1 WHERE id = ?')
                .run(invite.id);
        }

        db.exec('COMMIT');
    } catch (error) {
        try { db.exec('ROLLBACK'); } catch (_) {}
        throw error;
    }

    if (alreadyMember) {
        return res.json({ success: true, alreadyMember: true, serverId: invite.server_id });
    }

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
}));

module.exports = router;
