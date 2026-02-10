const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { validateCreateGroup, validateStartDm } = require('../middleware/validation');

const router = express.Router();

// Get all chats for current user (DMs and Groups only, channels via servers)
router.get('/', authenticateToken, (req, res) => {
    try {
        // Query now includes fetching the OTHER user's info for DMs
        const chats = db.prepare(`
      SELECT c.*, cm.nickname,
        (SELECT COUNT(*) FROM chat_members WHERE chat_id = c.id) as member_count,
        (SELECT m.content FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
        (SELECT m.created_at FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_at,
        -- For DMs, fetch the other user's name
        (SELECT u.display_name FROM chat_members cm2 JOIN users u ON cm2.user_id = u.id WHERE cm2.chat_id = c.id AND cm2.user_id != ? LIMIT 1) as other_display_name,
        (SELECT u.username FROM chat_members cm2 JOIN users u ON cm2.user_id = u.id WHERE cm2.chat_id = c.id AND cm2.user_id != ? LIMIT 1) as other_username
      FROM chats c
      INNER JOIN chat_members cm ON c.id = cm.chat_id
      WHERE cm.user_id = ? AND c.server_id IS NULL
      ORDER BY last_message_at DESC
    `).all(req.user.userId, req.user.userId, req.user.userId);

        res.json(chats.map(c => {
            let name = c.name;
            if (c.type === 'dm' && !name) {
                // If we found another user, use their name. If not (and count is 1), it's a self-DM.
                if (c.other_display_name || c.other_username) {
                    name = c.other_display_name || c.other_username;
                } else if (c.member_count === 1) {
                    name = 'Note to Self';
                } else {
                    name = 'Unknown User';
                }
            }

            return {
                id: c.id,
                name: name,
                isGroup: c.type === 'group',
                type: c.type,
                nickname: c.nickname,
                memberCount: c.member_count,
                lastMessage: c.last_message,
                lastMessageAt: c.last_message_at,
                createdAt: c.created_at
            };
        }));
    } catch (err) {
        console.error('Get chats error:', err);
        res.status(500).json({ error: 'Failed to get chats' });
    }
});

// Get unread message counts for all chats
router.get('/unread', authenticateToken, (req, res) => {
    try {
        // Count messages in each chat where:
        // 1. User is a member of the chat
        // 2. Message was not sent by this user
        // 3. User has no read receipt for the message
        const unreadCounts = db.prepare(`
            SELECT 
                c.id as chatId,
                COUNT(DISTINCT m.id) as count
            FROM chats c
            INNER JOIN chat_members cm ON c.id = cm.chat_id
            INNER JOIN messages m ON m.chat_id = c.id
            LEFT JOIN read_receipts rr ON rr.message_id = m.id AND rr.user_id = ?
            WHERE cm.user_id = ?
              AND m.user_id != ?
              AND rr.id IS NULL
            GROUP BY c.id
            HAVING count > 0
        `).all(req.user.userId, req.user.userId, req.user.userId);

        res.json({
            unread: unreadCounts.map(row => ({
                chatId: row.chatId,
                count: row.count
            }))
        });
    } catch (err) {
        console.error('Get unread counts error:', err);
        res.status(500).json({ error: 'Failed to get unread counts' });
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
            'INSERT INTO chats (name, type, created_by) VALUES (?, ?, ?)'
        ).run(name, 'group', req.user.userId);

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
            type: 'group',
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

        const isSelf = userId === req.user.userId;

        // Check if DM already exists
        let existingDm;
        if (isSelf) {
            existingDm = db.prepare(`
                SELECT c.id FROM chats c
                WHERE c.type = 'dm'
                AND c.server_id IS NULL
                AND EXISTS (SELECT 1 FROM chat_members WHERE chat_id = c.id AND user_id = ?)
                AND (SELECT COUNT(*) FROM chat_members WHERE chat_id = c.id) = 1
            `).get(req.user.userId);
        } else {
            existingDm = db.prepare(`
                SELECT c.id FROM chats c
                WHERE c.type = 'dm'
                AND c.server_id IS NULL
                AND EXISTS (SELECT 1 FROM chat_members WHERE chat_id = c.id AND user_id = ?)
                AND EXISTS (SELECT 1 FROM chat_members WHERE chat_id = c.id AND user_id = ?)
                AND (SELECT COUNT(*) FROM chat_members WHERE chat_id = c.id) = 2
            `).get(req.user.userId, userId);
        }

        if (existingDm) {
            return res.json({ id: existingDm.id, existing: true });
        }

        // Get other user's info (if not self)
        let otherUser = null;
        if (!isSelf) {
            otherUser = db.prepare('SELECT username, display_name FROM users WHERE id = ?').get(userId);
            if (!otherUser) {
                return res.status(404).json({ error: 'User not found' });
            }
        } else {
            // For self DM, we can just return "Note to Self" as name, or current user info
            otherUser = {
                username: req.user.username,
                display_name: 'Note to Self'
            };
        }

        // Create new DM
        const result = db.prepare(
            'INSERT INTO chats (name, type, created_by) VALUES (?, ?, ?)'
        ).run(null, 'dm', req.user.userId);

        const chatId = result.lastInsertRowid;

        // Add members
        db.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)').run(chatId, req.user.userId);
        if (!isSelf) {
            db.prepare('INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)').run(chatId, userId);
        }

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

        const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId);
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        let members = [];

        if (chat.server_id) {
            // Server channel - check server membership
            const serverMembership = db.prepare(
                'SELECT * FROM server_members WHERE server_id = ? AND user_id = ?'
            ).get(chat.server_id, req.user.userId);

            if (!serverMembership) {
                return res.status(403).json({ error: 'Not a member of this server' });
            }

            // Get all server members for the channel
            members = db.prepare(`
                SELECT u.id, u.username, u.display_name, u.avatar_url, sm.nickname
                FROM server_members sm
                INNER JOIN users u ON sm.user_id = u.id
                WHERE sm.server_id = ?
            `).all(chat.server_id);
        } else {
            // DM or group chat - check chat membership
            const membership = db.prepare(
                'SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?'
            ).get(chatId, req.user.userId);

            if (!membership) {
                return res.status(403).json({ error: 'Not a member of this chat' });
            }

            members = db.prepare(`
                SELECT u.id, u.username, u.display_name, u.avatar_url, cm.nickname
                FROM chat_members cm
                INNER JOIN users u ON cm.user_id = u.id
                WHERE cm.chat_id = ?
            `).all(chatId);
        }

        res.json({
            id: chat.id,
            name: chat.name,
            isGroup: chat.type === 'group',
            type: chat.type,
            serverId: chat.server_id,
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

        if (!chat || chat.type !== 'group') {
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
