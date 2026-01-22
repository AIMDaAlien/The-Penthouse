const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all chats for current user
router.get('/', authenticateToken, (req, res) => {
    try {
        const chats = db.prepare(`
      SELECT c.*, cm.nickname,
        (SELECT COUNT(*) FROM chat_members WHERE chat_id = c.id) as member_count,
        (SELECT m.content FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
        (SELECT m.created_at FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_at
      FROM chats c
      INNER JOIN chat_members cm ON c.id = cm.chat_id
      WHERE cm.user_id = ?
      ORDER BY last_message_at DESC
    `).all(req.user.userId);

        res.json(chats.map(c => ({
            id: c.id,
            name: c.name,
            isGroup: c.is_group === 1,
            nickname: c.nickname,
            memberCount: c.member_count,
            lastMessage: c.last_message,
            lastMessageAt: c.last_message_at,
            createdAt: c.created_at
        })));
    } catch (err) {
        console.error('Get chats error:', err);
        res.status(500).json({ error: 'Failed to get chats' });
    }
});

// Create a new group chat
router.post('/group', authenticateToken, (req, res) => {
    try {
        const { name, memberIds = [] } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Group name is required' });
        }

        // Create the chat
        const result = db.prepare(
            'INSERT INTO chats (name, is_group, created_by) VALUES (?, 1, ?)'
        ).run(name, req.user.userId);

        const chatId = result.lastInsertRowid;

        // Add creator as member
        db.prepare(
            'INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)'
        ).run(chatId, req.user.userId);

        // Add other members
        const addMember = db.prepare('INSERT OR IGNORE INTO chat_members (chat_id, user_id) VALUES (?, ?)');
        for (const userId of memberIds) {
            if (userId !== req.user.userId) {
                addMember.run(chatId, userId);
            }
        }

        res.status(201).json({
            id: chatId,
            name,
            isGroup: true,
            createdAt: new Date().toISOString()
        });
    } catch (err) {
        console.error('Create group error:', err);
        res.status(500).json({ error: 'Failed to create group' });
    }
});

// Start a DM with another user
router.post('/dm', authenticateToken, (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        if (userId === req.user.userId) {
            return res.status(400).json({ error: 'Cannot DM yourself' });
        }

        // Check if DM already exists between these two users
        const existingDm = db.prepare(`
      SELECT c.id FROM chats c
      WHERE c.is_group = 0
      AND EXISTS (SELECT 1 FROM chat_members WHERE chat_id = c.id AND user_id = ?)
      AND EXISTS (SELECT 1 FROM chat_members WHERE chat_id = c.id AND user_id = ?)
      AND (SELECT COUNT(*) FROM chat_members WHERE chat_id = c.id) = 2
    `).get(req.user.userId, userId);

        if (existingDm) {
            return res.json({ id: existingDm.id, existing: true });
        }

        // Get other user's info
        const otherUser = db.prepare('SELECT username, display_name FROM users WHERE id = ?').get(userId);
        if (!otherUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create new DM
        const result = db.prepare(
            'INSERT INTO chats (name, is_group, created_by) VALUES (?, 0, ?)'
        ).run(null, req.user.userId);

        const chatId = result.lastInsertRowid;

        // Add both users
        db.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)').run(chatId, req.user.userId);
        db.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)').run(chatId, userId);

        res.status(201).json({
            id: chatId,
            isGroup: false,
            otherUser: {
                id: userId,
                username: otherUser.username,
                displayName: otherUser.display_name
            }
        });
    } catch (err) {
        console.error('Create DM error:', err);
        res.status(500).json({ error: 'Failed to create DM' });
    }
});

// Get chat details with members
router.get('/:chatId', authenticateToken, (req, res) => {
    try {
        const { chatId } = req.params;

        // Verify membership
        const membership = db.prepare(
            'SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?'
        ).get(chatId, req.user.userId);

        if (!membership) {
            return res.status(403).json({ error: 'Not a member of this chat' });
        }

        const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId);

        const members = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar_url, cm.nickname
      FROM chat_members cm
      INNER JOIN users u ON cm.user_id = u.id
      WHERE cm.chat_id = ?
    `).all(chatId);

        res.json({
            id: chat.id,
            name: chat.name,
            isGroup: chat.is_group === 1,
            createdAt: chat.created_at,
            members: members.map(m => ({
                id: m.id,
                username: m.username,
                displayName: m.display_name,
                avatarUrl: m.avatar_url,
                nickname: m.nickname
            }))
        });
    } catch (err) {
        console.error('Get chat details error:', err);
        res.status(500).json({ error: 'Failed to get chat details' });
    }
});

// Add member to group chat
router.post('/:chatId/members', authenticateToken, (req, res) => {
    try {
        const { chatId } = req.params;
        const { userId } = req.body;

        const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId);

        if (!chat || chat.is_group !== 1) {
            return res.status(404).json({ error: 'Group chat not found' });
        }

        // Verify requester is member
        const membership = db.prepare(
            'SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?'
        ).get(chatId, req.user.userId);

        if (!membership) {
            return res.status(403).json({ error: 'Not a member of this chat' });
        }

        // Add new member
        db.prepare('INSERT OR IGNORE INTO chat_members (chat_id, user_id) VALUES (?, ?)').run(chatId, userId);

        res.json({ message: 'Member added' });
    } catch (err) {
        console.error('Add member error:', err);
        res.status(500).json({ error: 'Failed to add member' });
    }
});

// Get all users (for adding to chats)
router.get('/users/search', authenticateToken, (req, res) => {
    try {
        const { q } = req.query;

        let users;
        if (q) {
            users = db.prepare(`
        SELECT id, username, display_name, avatar_url FROM users 
        WHERE (username LIKE ? OR display_name LIKE ?) AND id != ?
        LIMIT 20
      `).all(`%${q}%`, `%${q}%`, req.user.userId);
        } else {
            users = db.prepare(`
        SELECT id, username, display_name, avatar_url FROM users 
        WHERE id != ?
        LIMIT 20
      `).all(req.user.userId);
        }

        res.json(users.map(u => ({
            id: u.id,
            username: u.username,
            displayName: u.display_name,
            avatarUrl: u.avatar_url
        })));
    } catch (err) {
        console.error('Search users error:', err);
        res.status(500).json({ error: 'Failed to search users' });
    }
});

module.exports = router;
