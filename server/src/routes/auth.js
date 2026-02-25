const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter, registerLimiter, refreshLimiter, logoutLimiter, forgotPasswordLimiter } = require('../middleware/rateLimit');
const { validateLogin, validateRegister, validateForgotPassword, validateResetPassword } = require('../middleware/validation');
const { sendPasswordResetEmail } = require('../services/email');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const debugLog = (...args) => {
    if (process.env.NODE_ENV !== 'production') console.log(...args);
};

// Register new user
router.post('/register', registerLimiter, validateRegister, asyncHandler(async (req, res) => {
    const { username, password, displayName } = req.body;
    const email = req.body.email?.trim() ? req.body.email.trim().toLowerCase() : null;

    const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUsername) {
        return res.status(409).json({ error: 'Username is already taken', field: 'username' });
    }

    if (email) {
        const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingEmail) {
            return res.status(409).json({ error: 'Email is already in use', field: 'email' });
        }
    }

    // Hash password with 12 rounds (more secure than default 10)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert user (defensive handling for race-condition uniqueness conflicts)
    let result;
    try {
        result = db.prepare(
            'INSERT INTO users (username, email, password, display_name) VALUES (?, ?, ?, ?)'
        ).run(username, email, hashedPassword, displayName || username);
    } catch (err) {
        const message = String(err?.message || '');
        if (message.includes('users.username')) {
            return res.status(409).json({ error: 'Username is already taken', field: 'username' });
        }
        if (message.includes('users.email')) {
            return res.status(409).json({ error: 'Email is already in use', field: 'email' });
        }
        throw err;
    }

    // Generate Access Token (7d)
    const accessToken = jwt.sign(
        { userId: result.lastInsertRowid, username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    // Generate Refresh Token (7d)
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store Refresh Token
    db.prepare('INSERT INTO refresh_tokens (user_id, token, token_hash, expires_at) VALUES (?, ?, ?, ?)')
      .run(result.lastInsertRowid, refreshTokenHash, refreshTokenHash, expiresAt.toISOString());

    res.status(201).json({
        message: 'Account created successfully',
        user: {
            id: result.lastInsertRowid,
            username,
            displayName: displayName || username
        },
        // Backwards compatibility for existing mobile clients.
        token: accessToken,
        accessToken,
        refreshToken
    });
}));

// Login
router.post('/login', authLimiter, validateLogin, asyncHandler(async (req, res) => {
    const { password } = req.body;
    const credential = req.body.username?.trim().toLowerCase() || '';

    debugLog('Login attempt for:', credential);

    // Find user by username or email
    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1').get(credential, credential);
    if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate Access Token (7d)
    const accessToken = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    // Generate Refresh Token (7d)
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store Refresh Token
    db.prepare('INSERT INTO refresh_tokens (user_id, token, token_hash, expires_at) VALUES (?, ?, ?, ?)')
      .run(user.id, refreshTokenHash, refreshTokenHash, expiresAt.toISOString());

    res.json({
        message: 'Login successful',
        user: {
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            avatarUrl: user.avatar_url
        },
        // Backwards compatibility for existing mobile clients.
        token: accessToken,
        accessToken,
        refreshToken
    });
}));

// Refresh Token
router.post('/refresh', refreshLimiter, asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required' });
    }

    const refreshTokenHash = hashToken(refreshToken);

    // Find valid token
    const storedToken = db.prepare(`
        SELECT * FROM refresh_tokens 
        WHERE (token_hash = ? OR token = ?)
        AND expires_at > CURRENT_TIMESTAMP
        LIMIT 1
    `).get(refreshTokenHash, refreshToken);

    if (!storedToken) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Revoke used token (Rotation)
    db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(storedToken.id);

    // Generate New Access Token (7d)
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(storedToken.user_id);
    const newAccessToken = jwt.sign(
        { userId: storedToken.user_id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    // Generate New Refresh Token (7d)
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const newRefreshTokenHash = hashToken(newRefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    db.prepare('INSERT INTO refresh_tokens (user_id, token, token_hash, expires_at) VALUES (?, ?, ?, ?)')
      .run(storedToken.user_id, newRefreshTokenHash, newRefreshTokenHash, expiresAt.toISOString());

    res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
    });
}));

// Logout (Revoke Refresh Token)
router.post('/logout', logoutLimiter, asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
        const refreshTokenHash = hashToken(refreshToken);
        db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ? OR token = ?').run(refreshTokenHash, refreshToken);
    }
    res.json({ message: 'Logged out successfully' });
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
router.post('/forgot-password', forgotPasswordLimiter, validateForgotPassword, asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    // Find user by email
    const user = db.prepare('SELECT id, username, email FROM users WHERE email = ?').get(email);

    if (!user) {
        // For now, just return success to avoid leaking existence
        return res.json({ message: 'If an account exists, a reset email has been sent.' });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Save to DB
    db.prepare(`
        INSERT INTO password_resets (user_id, token, token_hash, expires_at)
        VALUES (?, ?, ?, ?)
    `).run(user.id, tokenHash, tokenHash, expiresAt.toISOString());

    // Send Email
    await sendPasswordResetEmail(email, token, user.username);

    res.json({ message: 'If an account exists, a reset email has been sent.' });
}));

// Reset Password
router.post('/reset-password', validateResetPassword, asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    const tokenHash = hashToken(token);

    // Find valid token
    const resetRecord = db.prepare(`
        SELECT * FROM password_resets 
        WHERE (token_hash = ? OR token = ?)
        AND expires_at > CURRENT_TIMESTAMP
        LIMIT 1
    `).get(tokenHash, token);

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
