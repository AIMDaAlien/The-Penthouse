const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', '..', 'data', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|webm|mp3|wav|ogg/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = /image\/.+|audio\/.+/.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image and audio files are allowed'));
    }
});

// Upload voice message
router.post('/voice', authenticateToken, upload.single('voice'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No voice file uploaded' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;

        // Return details needed for the message
        res.json({
            url: fileUrl,
            params: {
                fileName: req.file.originalname,
                duration: req.body.duration || 0, // Frontend should send duration if possible
                mimeType: req.file.mimetype
            }
        });
    } catch (err) {
        console.error('Upload voice error:', err);
        res.status(500).json({ error: 'Failed to upload voice message' });
    }
});

// Upload profile picture
router.post('/avatar', authenticateToken, upload.single('avatar'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const avatarUrl = `/uploads/${req.file.filename}`;

        // Delete old avatar if exists
        const user = db.prepare('SELECT avatar_url FROM users WHERE id = ?').get(req.user.userId);
        if (user && user.avatar_url) {
            const oldPath = path.join(__dirname, '..', '..', 'data', user.avatar_url);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        // Update user
        db.prepare('UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(avatarUrl, req.user.userId);

        res.json({ avatarUrl });
    } catch (err) {
        console.error('Upload avatar error:', err);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});

// Upload custom emote
router.post('/emotes', authenticateToken, upload.single('emote'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Emote name is required' });
        }

        // Validate emote name (alphanumeric and underscores only)
        if (!/^[a-zA-Z0-9_]+$/.test(name)) {
            return res.status(400).json({ error: 'Emote name can only contain letters, numbers, and underscores' });
        }

        const imageUrl = `/uploads/${req.file.filename}`;

        // Check if emote name exists
        const existing = db.prepare('SELECT id FROM emotes WHERE name = ?').get(name);
        if (existing) {
            return res.status(409).json({ error: 'Emote name already exists' });
        }

        const result = db.prepare(
            'INSERT INTO emotes (name, image_url, created_by) VALUES (?, ?, ?)'
        ).run(name, imageUrl, req.user.userId);

        res.status(201).json({
            id: result.lastInsertRowid,
            name,
            imageUrl,
            createdBy: req.user.userId
        });
    } catch (err) {
        console.error('Upload emote error:', err);
        res.status(500).json({ error: 'Failed to upload emote' });
    }
});

// Get all emotes
router.get('/emotes', authenticateToken, (req, res) => {
    try {
        const emotes = db.prepare(`
      SELECT e.*, u.username as creator_username
      FROM emotes e
      LEFT JOIN users u ON e.created_by = u.id
      ORDER BY e.name
    `).all();

        res.json(emotes.map(e => ({
            id: e.id,
            name: e.name,
            imageUrl: e.image_url,
            createdBy: e.created_by,
            creatorUsername: e.creator_username,
            createdAt: e.created_at
        })));
    } catch (err) {
        console.error('Get emotes error:', err);
        res.status(500).json({ error: 'Failed to get emotes' });
    }
});

// Delete emote (creator only)
router.delete('/emotes/:id', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;

        const emote = db.prepare('SELECT * FROM emotes WHERE id = ?').get(id);

        if (!emote) {
            return res.status(404).json({ error: 'Emote not found' });
        }

        if (emote.created_by !== req.user.userId) {
            return res.status(403).json({ error: 'Can only delete your own emotes' });
        }

        // Delete file
        const filePath = path.join(__dirname, '..', '..', 'data', emote.image_url);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        db.prepare('DELETE FROM emotes WHERE id = ?').run(id);

        res.json({ message: 'Emote deleted' });
    } catch (err) {
        console.error('Delete emote error:', err);
        res.status(500).json({ error: 'Failed to delete emote' });
    }
});

module.exports = router;
