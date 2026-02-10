const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { sendPushNotification } = require('../services/push');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Send test notification (for debugging)
router.post('/test', authenticateToken, asyncHandler(async (req, res) => {
    const { title = 'Test', body = 'This is a test notification' } = req.body;
    
    const result = await sendPushNotification(
        req.user.userId,
        title,
        body,
        { type: 'test' }
    );

    res.json(result);
}));

// Register push token
router.post('/register', authenticateToken, asyncHandler(async (req, res) => {
    const { token, deviceType } = req.body;
    
    if (!token) {
        return res.status(400).json({ error: 'Push token is required' });
    }

    // Validate Expo push token format
    if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
        return res.status(400).json({ error: 'Invalid push token format' });
    }

    // Insert or update token (UNIQUE constraint on user_id + token)
    db.prepare(`
        INSERT OR REPLACE INTO push_tokens (user_id, token, device_type)
        VALUES (?, ?, ?)
    `).run(req.user.userId, token, deviceType || 'unknown');

    res.json({ success: true, message: 'Push token registered' });
}));

// Unregister push token (on logout)
router.delete('/unregister', authenticateToken, asyncHandler(async (req, res) => {
    const { token } = req.body;
    
    if (token) {
        // Remove specific token
        db.prepare('DELETE FROM push_tokens WHERE user_id = ? AND token = ?')
            .run(req.user.userId, token);
    } else {
        // Remove all tokens for user (full logout)
        db.prepare('DELETE FROM push_tokens WHERE user_id = ?')
            .run(req.user.userId);
    }

    res.json({ success: true, message: 'Push token unregistered' });
}));

// Get user's push tokens (for debugging)
router.get('/tokens', authenticateToken, asyncHandler(async (req, res) => {
    const tokens = db.prepare(`
        SELECT token, device_type, created_at 
        FROM push_tokens 
        WHERE user_id = ?
    `).all(req.user.userId);

    res.json({ tokens });
}));

module.exports = router;
