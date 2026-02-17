const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { messageLimiter } = require('../middleware/rateLimit');
const { validateMessage, validateEditMessage, sanitizeMessageContent } = require('../middleware/validation');
const asyncHandler = require('../utils/asyncHandler');
const ChatService = require('../services/chatService');

const router = express.Router();
const ensureChatAccess = (chatId, userId) => {
    const { isMember, chat } = ChatService.verifyMembership(chatId, userId);
    if (!chat) {
        return { ok: false, status: 404, error: 'Chat not found' };
    }
    if (!isMember) {
        return { ok: false, status: 403, error: 'Not a member of this chat' };
    }
    return { ok: true, chat };
};

// Get messages for a chat
router.get('/:chatId', authenticateToken, asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    const { limit = 50, before } = req.query;
    const parsedLimit = Number.parseInt(limit, 10);
    const safeLimit = Number.isInteger(parsedLimit)
        ? Math.min(Math.max(parsedLimit, 1), 100)
        : 50;

    const { isMember, chat } = ChatService.verifyMembership(chatId, req.user.userId);
    if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
    }
    if (!isMember) {
        return res.status(403).json({ error: 'Not a member of this chat' });
    }

    // Get messages with read status
    let query = `
      SELECT m.*, u.username, u.display_name, u.avatar_url,
      (SELECT MIN(read_at) FROM read_receipts rr WHERE rr.message_id = m.id AND rr.user_id != m.user_id) as read_at
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.chat_id = ?
    `;
    const params = [chatId];

    if (before) {
        query += ' AND m.id < ?';
        params.push(before);
    }

    query += ' ORDER BY m.created_at DESC, m.id DESC LIMIT ?';
    params.push(safeLimit);

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

    // Helper to ensure UTC
    const ensureUTC = (dateStr) => {
        if (!dateStr) return null;
        return dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
    };

    // Return in chronological order
    res.json(messages.reverse().map(m => ({
        id: m.id,
        content: m.content,
        type: m.message_type,
        metadata: m.metadata ? JSON.parse(m.metadata) : null,
        replyTo: m.reply_to || null,
        replyToMessage: m.reply_to ? replyMap[m.reply_to] || null : null,
        reactions: reactionsMap[m.id] || [],
        createdAt: ensureUTC(m.created_at),
        edited_at: ensureUTC(m.edited_at),
        deleted_at: ensureUTC(m.deleted_at),
        readAt: ensureUTC(m.read_at),
        sender: {
            id: m.user_id,
            username: m.username,
            displayName: m.display_name,
            avatarUrl: m.avatar_url
        }
    })));
}));

// Send a message
router.post('/:chatId', authenticateToken, messageLimiter, validateMessage, asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    let { content, type = 'text', metadata, replyTo } = req.body;

    // Sanitize text content
    if (type === 'text' && content) {
        content = sanitizeMessageContent(content);
    }

    if (!content && type === 'text') {
        return res.status(400).json({ error: 'Message content is required' });
    }

    const { isMember, chat } = ChatService.verifyMembership(chatId, req.user.userId);
    if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
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
        edited_at: null,
        deleted_at: null,
        readAt: null,
        sender: {
            id: req.user.userId,
            username: req.user.username
        }
    };

    // Broadcast via WebSocket
    const io = req.app.get('io');
    io.to(`chat:${chatId}`).emit('new_message', message);

    // Send Push Notifications (async, don't wait for it)
    (async () => {
        try {
            // Get recipients excluding sender
            const members = ChatService.getChatMembers(chat, req.user.userId);

            if (members.length > 0) {
                // Filter out users who are actively in the chat socket room
                const chatRoom = `chat:${chatId}`;
                const socketsInRoom = await io.in(chatRoom).fetchSockets();
                const activeUserIds = new Set(socketsInRoom.map(s => s.userId));

                const offlineRecipientIds = members
                    .map(m => m.id)
                    .filter(id => !activeUserIds.has(id));

                if (offlineRecipientIds.length === 0) return;

                const { sendGroupPushNotification } = require('../services/push');
                
                // Fetch sender's display name from DB (JWT only has userId/username)
                const senderRow = db.prepare('SELECT display_name FROM users WHERE id = ?').get(req.user.userId);
                const senderName = senderRow?.display_name || req.user.username;

                let title = senderName;
                let body = type === 'text' ? (content.length > 100 ? content.slice(0, 100) + '…' : content) : `Sent a ${type}`;
                
                // For group chats/servers, append chat context
                if (chat.server_id || (chat.name && !chat.server_id)) {
                    const chatName = chat.name || 'Channel'; 
                    title = `${senderName} in ${chatName}`;
                }

                await sendGroupPushNotification(
                    offlineRecipientIds,
                    title,
                    body,
                    { 
                        type: 'new_message', 
                        chatId: parseInt(chatId), 
                        messageId: message.id,
                        serverId: chat.server_id || null
                    }
                );
            }
        } catch (pushErr) {
            console.error('Error sending push notifications:', pushErr);
        }
    })();

    res.status(201).json(message);
}));

// Edit a message
router.put('/:messageId', authenticateToken, asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
    if (!message) {
        return res.status(404).json({ error: 'Message not found' });
    }
    const access = ensureChatAccess(message.chat_id, req.user.userId);
    if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
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
}));

// Delete a message (own messages only)
router.delete('/:messageId', authenticateToken, asyncHandler(async (req, res) => {
    const { messageId } = req.params;

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
    if (!message) {
        return res.status(404).json({ error: 'Message not found' });
    }
    const access = ensureChatAccess(message.chat_id, req.user.userId);
    if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
    }

    if (message.user_id !== req.user.userId) {
        return res.status(403).json({ error: 'Can only delete your own messages' });
    }

    // Soft delete: set deleted_at instead of removing the row
    db.prepare('UPDATE messages SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(messageId);

    // Notify via WebSocket
    const io = req.app.get('io');
    io.to(`chat:${message.chat_id}`).emit('message_deleted', {
        messageId: parseInt(messageId),
        chatId: message.chat_id,
        deletedAt: new Date().toISOString()
    });

    res.json({ success: true });
}));

// Add reaction to a message
router.post('/:messageId/react', authenticateToken, asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
        return res.status(400).json({ error: 'Emoji is required' });
    }

    const message = db.prepare('SELECT chat_id FROM messages WHERE id = ?').get(messageId);
    if (!message) {
        return res.status(404).json({ error: 'Message not found' });
    }
    const access = ensureChatAccess(message.chat_id, req.user.userId);
    if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
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
}));

// Remove reaction from a message
router.delete('/:messageId/react/:emoji', authenticateToken, asyncHandler(async (req, res) => {
    const { messageId, emoji } = req.params;

    const message = db.prepare('SELECT chat_id FROM messages WHERE id = ?').get(messageId);
    if (!message) {
        return res.status(404).json({ error: 'Message not found' });
    }
    const access = ensureChatAccess(message.chat_id, req.user.userId);
    if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
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
}));

// Mark a message as read (insert read receipt)
router.post('/:messageId/read', authenticateToken, asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = db.prepare('SELECT chat_id FROM messages WHERE id = ?').get(messageId);
    if (!message) {
        return res.status(404).json({ error: 'Message not found' });
    }
    const access = ensureChatAccess(message.chat_id, req.user.userId);
    if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
    }

    // Insert or ignore if already read
    db.prepare(
        'INSERT OR IGNORE INTO read_receipts (message_id, user_id) VALUES (?, ?)'
    ).run(messageId, userId);

    // Broadcast read receipt
    const io = req.app.get('io');
    io.to(`chat:${message.chat_id}`).emit('message_read', {
        messageId: parseInt(messageId),
        chatId: message.chat_id,
        userId,
        readAt: new Date().toISOString()
    });

    res.json({ success: true });
}));

// Get pinned messages for a chat
router.get('/pins/:chatId', authenticateToken, asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    const access = ensureChatAccess(chatId, req.user.userId);
    if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
    }

    const pins = db.prepare(`
        SELECT pm.id as pin_id, pm.pinned_at, pm.pinned_by,
               m.*, u.username, u.display_name, u.avatar_url,
               p_u.username as panner_username
        FROM pinned_messages pm
        JOIN messages m ON pm.message_id = m.id
        LEFT JOIN users u ON m.user_id = u.id
        LEFT JOIN users p_u ON pm.pinned_by = p_u.id
        WHERE pm.chat_id = ?
        ORDER BY pm.pinned_at DESC
    `).all(chatId);

    // Map to standard message format with pin metadata
    const pinnedMessages = pins.map(p => ({
        id: p.id,
        content: p.content,
        type: p.message_type,
        metadata: p.metadata ? JSON.parse(p.metadata) : null,
        createdAt: p.created_at + (p.created_at.endsWith('Z') ? '' : 'Z'), // Ensure UTC
        sender: {
            id: p.user_id,
            username: p.username,
            displayName: p.display_name,
            avatarUrl: p.avatar_url
        },
        pinId: p.pin_id,
        pinnedAt: p.pinned_at,
        pinnedBy: p.panner_username
    }));

    res.json(pinnedMessages);
}));

// Pin a message
router.post('/:messageId/pin', authenticateToken, asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = db.prepare('SELECT chat_id FROM messages WHERE id = ?').get(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    const access = ensureChatAccess(message.chat_id, req.user.userId);
    if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
    }

    // Insert pin (ignore if exists)
    try {
        db.prepare(
            'INSERT INTO pinned_messages (chat_id, message_id, pinned_by) VALUES (?, ?, ?)'
        ).run(message.chat_id, messageId, userId);
    } catch (e) {
        return res.json({ success: true }); // Already pinned
    }

    // Get full message details for broadcast
    const pinnedMsg = db.prepare(`
        SELECT m.*, u.username, u.display_name, u.avatar_url
        FROM messages m
        LEFT JOIN users u ON m.user_id = u.id
        WHERE m.id = ?
    `).get(messageId);

    const payload = {
        id: pinnedMsg.id,
        content: pinnedMsg.content,
        type: pinnedMsg.message_type,
        metadata: pinnedMsg.metadata ? JSON.parse(pinnedMsg.metadata) : null,
        createdAt: pinnedMsg.created_at + (pinnedMsg.created_at.endsWith('Z') ? '' : 'Z'),
        sender: {
            id: pinnedMsg.user_id,
            username: pinnedMsg.username,
            displayName: pinnedMsg.display_name,
            avatarUrl: pinnedMsg.avatar_url
        },
        pinnedBy: req.user.username,
        pinnedAt: new Date().toISOString()
    };

    const io = req.app.get('io');
    io.to(`chat:${message.chat_id}`).emit('message_pinned', {
        chatId: message.chat_id,
        message: payload
    });

    res.json({ success: true, message: payload });
}));

// Unpin a message
router.delete('/:messageId/pin', authenticateToken, asyncHandler(async (req, res) => {
    const { messageId } = req.params;

    const message = db.prepare('SELECT chat_id FROM messages WHERE id = ?').get(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    const access = ensureChatAccess(message.chat_id, req.user.userId);
    if (!access.ok) {
        return res.status(access.status).json({ error: access.error });
    }

    db.prepare('DELETE FROM pinned_messages WHERE message_id = ?').run(messageId);

    const io = req.app.get('io');
    io.to(`chat:${message.chat_id}`).emit('message_unpinned', {
        chatId: message.chat_id,
        messageId: parseInt(messageId)
    });

    res.json({ success: true });
}));

module.exports = router;
