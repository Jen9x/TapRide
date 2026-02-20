const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// POST /blocks — block a user
router.post('/', requireAuth, async (req, res) => {
    const { blocked_id } = req.body;
    const blocker_id = req.user.id;

    if (!blocked_id) return res.status(400).json({ error: 'blocked_id is required.' });
    if (blocked_id === blocker_id) return res.status(400).json({ error: 'Cannot block yourself.' });

    try {
        await pool.query(
            'INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [blocker_id, blocked_id]
        );
        res.status(201).json({ success: true });
    } catch (err) {
        console.error('POST /blocks error:', err.message);
        res.status(500).json({ error: 'Failed to block user.' });
    }
});

// DELETE /blocks/:blockedId — unblock a user
router.delete('/:blockedId', requireAuth, async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2',
            [req.user.id, req.params.blockedId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /blocks error:', err.message);
        res.status(500).json({ error: 'Failed to unblock user.' });
    }
});

// GET /blocks — list users blocked by current user
router.get('/', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT blocked_id, created_at FROM blocks WHERE blocker_id = $1',
            [req.user.id]
        );
        res.json({ blocks: rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch blocks.' });
    }
});

module.exports = router;
