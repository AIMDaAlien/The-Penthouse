/**
 * GIF Proxy Routes
 *
 * Proxies GIPHY and Klipy API calls through the server so that:
 *  1. API keys stay server-side (never shipped in client bundles)
 *  2. CSP connectSrc: 'self' doesn't block GIF loading on web
 *  3. Responses can be cached for performance
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const GIPHY_API_KEY = process.env.GIPHY_API_KEY || '';
const KLIPY_API_KEY = process.env.KLIPY_API_KEY || '';

// ─── GIPHY ────────────────────────────────────────────────

router.get('/giphy/trending', authenticateToken, apiLimiter, async (req, res) => {
    if (!GIPHY_API_KEY) return res.status(503).json({ error: 'GIPHY not configured' });

    try {
        const limit = Math.min(parseInt(req.query.limit) || 30, 50);
        const url = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&rating=pg-13`;
        const response = await fetch(url);
        const json = await response.json();
        res.json(json);
    } catch (err) {
        console.error('GIPHY trending proxy error:', err.message);
        res.status(502).json({ error: 'Failed to fetch from GIPHY' });
    }
});

router.get('/giphy/search', authenticateToken, apiLimiter, async (req, res) => {
    if (!GIPHY_API_KEY) return res.status(503).json({ error: 'GIPHY not configured' });

    const q = req.query.q;
    if (!q) return res.status(400).json({ error: 'Search query required' });

    try {
        const limit = Math.min(parseInt(req.query.limit) || 30, 50);
        const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&rating=pg-13`;
        const response = await fetch(url);
        const json = await response.json();
        res.json(json);
    } catch (err) {
        console.error('GIPHY search proxy error:', err.message);
        res.status(502).json({ error: 'Failed to search GIPHY' });
    }
});

// ─── KLIPY ────────────────────────────────────────────────

router.get('/klipy/trending', authenticateToken, apiLimiter, async (req, res) => {
    if (!KLIPY_API_KEY) return res.status(503).json({ error: 'Klipy not configured' });

    try {
        const url = `https://api.klipy.com/api/v1/${KLIPY_API_KEY}/gifs/trending?per_page=30&page=1`;
        const response = await fetch(url);
        const json = await response.json();
        res.json(json);
    } catch (err) {
        console.error('Klipy trending proxy error:', err.message);
        res.status(502).json({ error: 'Failed to fetch from Klipy' });
    }
});

router.get('/klipy/search', authenticateToken, apiLimiter, async (req, res) => {
    if (!KLIPY_API_KEY) return res.status(503).json({ error: 'Klipy not configured' });

    const q = req.query.q;
    if (!q) return res.status(400).json({ error: 'Search query required' });

    try {
        const url = `https://api.klipy.com/api/v1/${KLIPY_API_KEY}/gifs/search?q=${encodeURIComponent(q)}&per_page=30&page=1`;
        const response = await fetch(url);
        const json = await response.json();
        res.json(json);
    } catch (err) {
        console.error('Klipy search proxy error:', err.message);
        res.status(502).json({ error: 'Failed to search Klipy' });
    }
});

module.exports = router;
