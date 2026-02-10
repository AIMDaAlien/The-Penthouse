const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

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
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        // Allow common image and audio formats
        const allowedExtensions = /jpeg|jpg|png|gif|webp|webm|mp3|wav|ogg|m4a|aac|mp4|caf|3gp/;
        const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
        // Accept image/*, audio/*, and video/* mime types
        const mimetype = /^(image|audio|video)\/.+/.test(file.mimetype);

        console.log(`File filter check: name=${file.originalname}, ext=${path.extname(file.originalname)}, mime=${file.mimetype}, extOk=${extname}, mimeOk=${mimetype}`);

        if (extname || mimetype) {
            return cb(null, true);
        }
        const error = new Error(`File type not allowed. Got: ${file.mimetype}, ext: ${path.extname(file.originalname)}`);
        console.error('File rejected:', error.message);
        cb(error);
    }
});

// Generic file upload
router.post('/upload', authenticateToken, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        console.error('Upload error: No file received. Body:', req.body);
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const mimeType = req.file.mimetype;
    const type = mimeType.startsWith('image/') ? 'image' :
                 mimeType.startsWith('video/') ? 'video' : 'file';

    console.log(`File uploaded: ${req.file.filename}, MIME: ${mimeType}, Type: ${type}`);

    res.json({
        url: fileUrl,
        type: type,
        mimeType: mimeType,
        filename: req.file.originalname
    });
}));

// Upload voice message
router.post('/voice', authenticateToken, upload.single('voice'), asyncHandler(async (req, res) => {
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
}));

// Upload profile picture
router.post('/avatar', authenticateToken, upload.single('avatar'), asyncHandler(async (req, res) => {
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
}));

// Upload server icon
router.post('/server-icon', authenticateToken, upload.single('icon'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const iconUrl = `/uploads/${req.file.filename}`;

    // If serverId is provided, update that server's icon
    const { serverId } = req.body;
    if (serverId) {
        // Verify user is the server owner
        const server = db.prepare('SELECT owner_id, icon_url FROM servers WHERE id = ?').get(serverId);
        if (!server) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Server not found' });
        }
        if (server.owner_id !== req.user.userId) {
            fs.unlinkSync(req.file.path);
            return res.status(403).json({ error: 'Only the server owner can update the icon' });
        }

        // Delete old icon if exists
        if (server.icon_url) {
            const oldPath = path.join(__dirname, '..', '..', 'data', server.icon_url);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        db.prepare('UPDATE servers SET icon_url = ? WHERE id = ?')
            .run(iconUrl, serverId);
    }

    res.json({ iconUrl });
}));

// Upload custom emote
router.post('/emotes', authenticateToken, upload.single('emote'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const { name } = req.body;
    if (!name) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Emote name is required' });
    }

    // Validate emote name (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Emote name can only contain letters, numbers, and underscores' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    // Check if emote name exists
    const existing = db.prepare('SELECT id FROM emotes WHERE name = ?').get(name);
    if (existing) {
        fs.unlinkSync(req.file.path);
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
}));

// Get all emotes
router.get('/emotes', authenticateToken, asyncHandler(async (req, res) => {
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
}));

// Delete emote (creator only)
router.delete('/emotes/:id', authenticateToken, asyncHandler(async (req, res) => {
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
}));

module.exports = router;
