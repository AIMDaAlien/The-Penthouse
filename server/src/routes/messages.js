const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get messages for a chat
router.get('/:chatId', authenticateToken, (req, res) => {
    try {
        const { chatId } = req.params;
        const { limit = 50, before } = req.query;

        // Get chat to check type
        const chat = db.prepare('SELECT server_id FROM chats WHERE id = ?').get(chatId);
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        // Verify membership
        let isMember = false;
        if (chat.server_id) {
            // Server channel: Check server membership
            const member = db.prepare(
                'SELECT 1 FROM server_members WHERE server_id = ? AND user_id = ?'
            ).get(chat.server_id, req.user.userId);
            isMember = !!member;
        } else {
            // DM/Group: Check chat membership
            const member = db.prepare(
                'SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?'
            ).get(chatId, req.user.userId);
            isMember = !!member;
        }

        if (!isMember) {
            return res.status(403).json({ error: 'Not a member of this chat' });
        }

        // Get messages
        let query = `
      SELECT m.*, u.username, u.display_name, u.avatar_url
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.chat_id = ?
    `;
        const params = [chatId];

        if (before) {
            query += ' AND m.id < ?';
            params.push(before);
        }

        query += ' ORDER BY m.created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const messages = db.prepare(query).all(...params);

        // Return in chronological order
        res.json(messages.reverse().map(m => ({
            id: m.id,
            content: m.content,
            type: m.message_type,
            metadata: m.metadata ? JSON.parse(m.metadata) : null,
            createdAt: m.created_at,
            sender: {
                id: m.user_id,
                username: m.username,
                displayName: m.display_name,
                avatarUrl: m.avatar_url
            }
        })));
    } catch (err) {
        console.error('Get messages error:', err);
        res.status(500).json({ error: 'Failed to get messages' });
    }
});

// Send a message
router.post('/:chatId', authenticateToken, (req, res) => {
    try {
        const { chatId } = req.params;
        const { content, type = 'text', metadata } = req.body;

        if (!content && type === 'text') {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Get chat to check type
        const chat = db.prepare('SELECT server_id FROM chats WHERE id = ?').get(chatId);
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        // Verify membership
        let isMember = false;
        if (chat.server_id) {
            const member = db.prepare(
                'SELECT 1 FROM server_members WHERE server_id = ? AND user_id = ?'
            ).get(chat.server_id, req.user.userId);
            isMember = !!member;
        } else {
            const member = db.prepare(
                'SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?'
            ).get(chatId, req.user.userId);
            isMember = !!member;
        }

        if (!isMember) {
            return res.status(403).json({ error: 'Not a member of this chat' });
        }

        // Insert message
        const result = db.prepare(
            'INSERT INTO messages (chat_id, user_id, content, message_type, metadata) VALUES (?, ?, ?, ?, ?)'
        ).run(chatId, req.user.userId, content, type, metadata ? JSON.stringify(metadata) : null);

        const message = {
            id: result.lastInsertRowid,
            chatId: parseInt(chatId),
            content,
            type,
            metadata: metadata || null,
            createdAt: new Date().toISOString(),
            sender: {
                id: req.user.userId,
                username: req.user.username
            }
        };

        // Broadcast via WebSocket
        const io = req.app.get('io');
        // If it's a channel, we might want to broadcast to server room or channel room.
        // Currently architecture uses chat:chatId room for everything. That works.
        io.to(`chat:${chatId}`).emit('new_message', message);

        res.status(201).json(message);
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Delete a message (own messages only)
router.delete('/:messageId', authenticateToken, (req, res) => {
    try {
        const { messageId } = req.params;

        const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        if (message.user_id !== req.user.userId) {
            return res.status(403).json({ error: 'Can only delete your own messages' });
        }

        db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);

        // Notify via WebSocket
        const io = req.app.get('io');
        io.to(`chat:${message.chat_id}`).emit('message_deleted', { messageId, chatId: message.chat_id });

        res.json({ message: 'Message deleted' });
    } catch (err) {
        console.error('Delete message error:', err);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

module.exports = router;
