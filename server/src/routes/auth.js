const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter, registerLimiter } = require('../middleware/rateLimit');
const { validateLogin, validateRegister, validateForgotPassword, validateResetPassword } = require('../middleware/validation');
const { sendPasswordResetEmail } = require('../services/email');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Register new user
router.post('/register', registerLimiter, validateRegister, asyncHandler(async (req, res) => {
    const { username, email, password, displayName } = req.body;

    // Check if username or email exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
        return res.status(409).json({ error: 'Username or email already taken' });
    }

    // Hash password with 12 rounds (more secure than default 10)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert user
    const result = db.prepare(
        'INSERT INTO users (username, email, password, display_name) VALUES (?, ?, ?, ?)'
    ).run(username, email, hashedPassword, displayName || username);

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
}));

// Login
router.post('/login', authLimiter, validateLogin, asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    console.log('Login attempt for:', username);

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);

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
}));

// Get current user profile
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
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
}));

// Update profile
router.patch('/me', authenticateToken, asyncHandler(async (req, res) => {
    const { displayName } = req.body;

    db.prepare(
        'UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(displayName, req.user.userId);

    res.json({ message: 'Profile updated' });
}));

// Update profile (PUT - for frontend compatibility)
router.put('/profile', authenticateToken, asyncHandler(async (req, res) => {
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
}));

// ─────────────────────────────────────────────────────────────
// Password Recovery
// ─────────────────────────────────────────────────────────────

// Request Password Reset
router.post('/forgot-password', validateForgotPassword, asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    // Find user by email
    const user = db.prepare('SELECT id, username, email FROM users WHERE email = ?').get(email);

    if (!user) {
        // For now, just return success to avoid leaking existence
        return res.json({ message: 'If an account exists, a reset email has been sent.' });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Save to DB
    db.prepare(`
        INSERT INTO password_resets (user_id, token, expires_at)
        VALUES (?, ?, ?)
    `).run(user.id, token, expiresAt.toISOString());

    // Send Email
    await sendPasswordResetEmail(email, token, user.username);

    res.json({ message: 'If an account exists, a reset email has been sent.' });
}));

// Reset Password
router.post('/reset-password', validateResetPassword, asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    // Find valid token
    const resetRecord = db.prepare(`
        SELECT * FROM password_resets 
        WHERE token = ? AND expires_at > CURRENT_TIMESTAMP
    `).get(token);

    if (!resetRecord) {
        return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    db.prepare('UPDATE users SET password = ? WHERE id = ?')
        .run(hashedPassword, resetRecord.user_id);

    // Delete used token (and potentially all other tokens for this user)
    db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(resetRecord.user_id);

    res.json({ message: 'Password has been reset successfully' });
}));

module.exports = router;
