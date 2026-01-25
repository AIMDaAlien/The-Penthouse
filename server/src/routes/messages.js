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

        // Get reactions for all messages
        const messageIds = messages.map(m => m.id);
        let reactionsMap = {};
        if (messageIds.length > 0) {
            const placeholders = messageIds.map(() => '?').join(',');
            const allReactions = db.prepare(`
                SELECT r.message_id, r.emoji, r.user_id, u.username, u.display_name
                FROM reactions r
                JOIN users u ON r.user_id = u.id
                WHERE r.message_id IN (${placeholders})
            `).all(...messageIds);

            allReactions.forEach(r => {
                if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = [];
                reactionsMap[r.message_id].push({
                    emoji: r.emoji,
                    userId: r.user_id,
                    username: r.username,
                    displayName: r.display_name
                });
            });
        }

        // Build reply context map for messages with reply_to
        const replyIds = messages.filter(m => m.reply_to).map(m => m.reply_to);
        let replyMap = {};
        if (replyIds.length > 0) {
            const replyPlaceholders = replyIds.map(() => '?').join(',');
            const replyMessages = db.prepare(`
                SELECT m.id, m.content, m.user_id, u.username, u.display_name
                FROM messages m
                LEFT JOIN users u ON m.user_id = u.id
                WHERE m.id IN (${replyPlaceholders})
            `).all(...replyIds);

            replyMessages.forEach(r => {
                replyMap[r.id] = {
                    id: r.id,
                    content: r.content?.slice(0, 100) || '',
                    sender: {
                        id: r.user_id,
                        username: r.username,
                        displayName: r.display_name
                    }
                };
            });
        }

        // Return in chronological order
        res.json(messages.reverse().map(m => ({
            id: m.id,
            content: m.content,
            type: m.message_type,
            metadata: m.metadata ? JSON.parse(m.metadata) : null,
            replyTo: m.reply_to || null,
            replyToMessage: m.reply_to ? replyMap[m.reply_to] || null : null,
            reactions: reactionsMap[m.id] || [],
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
        const { content, type = 'text', metadata, replyTo } = req.body;

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

        // Insert message with optional reply_to
        const result = db.prepare(
            'INSERT INTO messages (chat_id, user_id, content, message_type, metadata, reply_to) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(chatId, req.user.userId, content, type, metadata ? JSON.stringify(metadata) : null, replyTo || null);

        // Get reply context if replying
        let replyToMessage = null;
        if (replyTo) {
            const originalMsg = db.prepare(`
                SELECT m.id, m.content, m.user_id, u.username, u.display_name
                FROM messages m
                LEFT JOIN users u ON m.user_id = u.id
                WHERE m.id = ?
            `).get(replyTo);
            if (originalMsg) {
                replyToMessage = {
                    id: originalMsg.id,
                    content: originalMsg.content?.slice(0, 100) || '',
                    sender: {
                        id: originalMsg.user_id,
                        username: originalMsg.username,
                        displayName: originalMsg.display_name
                    }
                };
            }
        }

        const message = {
            id: result.lastInsertRowid,
            chatId: parseInt(chatId),
            content,
            type,
            metadata: metadata || null,
            replyTo: replyTo || null,
            replyToMessage,
            reactions: [],
            createdAt: new Date().toISOString(),
            sender: {
                id: req.user.userId,
                username: req.user.username
            }
        };

        // Broadcast via WebSocket
        const io = req.app.get('io');
        io.to(`chat:${chatId}`).emit('new_message', message);

        res.status(201).json(message);
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Edit a message
router.put('/:messageId', authenticateToken, (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        if (message.user_id !== req.user.userId) {
            return res.status(403).json({ error: 'Can only edit your own messages' });
        }

        if (message.deleted_at) {
            return res.status(400).json({ error: 'Cannot edit a deleted message' });
        }

        db.prepare('UPDATE messages SET content = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ?').run(content, messageId);

        const updatedMessage = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);

        // Notify via WebSocket
        const io = req.app.get('io');
        io.to(`chat:${message.chat_id}`).emit('message_edited', {
            messageId,
            chatId: message.chat_id,
            content,
            editedAt: updatedMessage.edited_at
        });

        res.json(updatedMessage);
    } catch (err) {
        console.error('Edit message error:', err);
        res.status(500).json({ error: 'Failed to edit message' });
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

        if (message.deleted_at) {
            return res.status(400).json({ error: 'Message already deleted' });
        }

        db.prepare('UPDATE messages SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(messageId);

        // Notify via WebSocket
        const io = req.app.get('io');
        io.to(`chat:${message.chat_id}`).emit('message_deleted', { messageId, chatId: message.chat_id });

        res.json({ message: 'Message deleted' });
    } catch (err) {
        console.error('Delete message error:', err);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

// Add reaction to a message
router.post('/:messageId/react', authenticateToken, (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;

        if (!emoji) {
            return res.status(400).json({ error: 'Emoji is required' });
        }

        const message = db.prepare('SELECT chat_id FROM messages WHERE id = ?').get(messageId);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Insert or ignore if already exists
        db.prepare(
            'INSERT OR IGNORE INTO reactions (message_id, user_id, emoji) VALUES (?, ?, ?)'
        ).run(messageId, req.user.userId, emoji);

        // Get updated reactions for this message
        const reactions = db.prepare(`
            SELECT r.emoji, r.user_id, u.username, u.display_name
            FROM reactions r
            JOIN users u ON r.user_id = u.id
            WHERE r.message_id = ?
        `).all(messageId);

        // Broadcast reaction update
        const io = req.app.get('io');
        io.to(`chat:${message.chat_id}`).emit('reaction_update', {
            messageId: parseInt(messageId),
            chatId: message.chat_id,
            reactions
        });

        res.json({ reactions });
    } catch (err) {
        console.error('Add reaction error:', err);
        res.status(500).json({ error: 'Failed to add reaction' });
    }
});

// Remove reaction from a message
router.delete('/:messageId/react/:emoji', authenticateToken, (req, res) => {
    try {
        const { messageId, emoji } = req.params;

        const message = db.prepare('SELECT chat_id FROM messages WHERE id = ?').get(messageId);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        db.prepare(
            'DELETE FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?'
        ).run(messageId, req.user.userId, emoji);

        // Get updated reactions
        const reactions = db.prepare(`
            SELECT r.emoji, r.user_id, u.username, u.display_name
            FROM reactions r
            JOIN users u ON r.user_id = u.id
            WHERE r.message_id = ?
        `).all(messageId);

        const io = req.app.get('io');
        io.to(`chat:${message.chat_id}`).emit('reaction_update', {
            messageId: parseInt(messageId),
            chatId: message.chat_id,
            reactions
        });

        res.json({ reactions });
    } catch (err) {
        console.error('Remove reaction error:', err);
        res.status(500).json({ error: 'Failed to remove reaction' });
    }
});

module.exports = router;
