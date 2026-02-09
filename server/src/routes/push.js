const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register push token
router.post('/register', authenticateToken, (req, res) => {
    try {
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
    } catch (err) {
        console.error('Register push token error:', err);
        res.status(500).json({ error: 'Failed to register push token' });
    }
});

// Unregister push token (on logout)
router.delete('/unregister', authenticateToken, (req, res) => {
    try {
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
    } catch (err) {
        console.error('Unregister push token error:', err);
        res.status(500).json({ error: 'Failed to unregister push token' });
    }
});

// Get user's push tokens (for debugging)
router.get('/tokens', authenticateToken, (req, res) => {
    try {
        const tokens = db.prepare(`
            SELECT token, device_type, created_at 
            FROM push_tokens 
            WHERE user_id = ?
        `).all(req.user.userId);

        res.json({ tokens });
    } catch (err) {
        console.error('Get push tokens error:', err);
        res.status(500).json({ error: 'Failed to get push tokens' });
    }
});

module.exports = router;
