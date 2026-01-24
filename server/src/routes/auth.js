const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, password, displayName } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ error: 'Username must be 3-20 characters' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if username exists
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existing) {
            return res.status(409).json({ error: 'Username already taken' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const result = db.prepare(
            'INSERT INTO users (username, password, display_name) VALUES (?, ?, ?)'
        ).run(username, hashedPassword, displayName || username);

        // Generate token
        const token = jwt.sign(
            { userId: result.lastInsertRowid, username },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            message: 'Account created successfully',
            user: {
                id: result.lastInsertRowid,
                username,
                displayName: displayName || username
            },
            token
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Failed to create account' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        console.log('Login attempt for:', username);

        // Find user
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) {
            console.log('User not found in DB:', username);
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        console.log('User found:', user.username, 'ID:', user.id);

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        console.log('Password valid:', validPassword);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                displayName: user.display_name,
                avatarUrl: user.avatar_url
            },
            token
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user profile
router.get('/me', authenticateToken, (req, res) => {
    try {
        const user = db.prepare(
            'SELECT id, username, display_name, avatar_url, created_at FROM users WHERE id = ?'
        ).get(req.user.userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
            createdAt: user.created_at
        });
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Update profile
router.patch('/me', authenticateToken, (req, res) => {
    try {
        const { displayName } = req.body;

        db.prepare(
            'UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(displayName, req.user.userId);

        res.json({ message: 'Profile updated' });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Update profile (PUT - for frontend compatibility)
router.put('/profile', authenticateToken, (req, res) => {
    try {
        const { displayName, avatarUrl } = req.body;

        db.prepare(
            'UPDATE users SET display_name = COALESCE(?, display_name), avatar_url = COALESCE(?, avatar_url), updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(displayName || null, avatarUrl || null, req.user.userId);

        const user = db.prepare(
            'SELECT id, username, display_name, avatar_url FROM users WHERE id = ?'
        ).get(req.user.userId);

        res.json({
            displayName: user.display_name,
            avatarUrl: user.avatar_url
        });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

module.exports = router;
