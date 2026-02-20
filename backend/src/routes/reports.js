const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// POST /reports — file a report
router.post('/', requireAuth, async (req, res) => {
    const { target_user_id, reason, details } = req.body;
    const reporter_id = req.user.id;

    if (!target_user_id || !reason) {
        return res.status(400).json({ error: 'target_user_id and reason are required.' });
    }
    const validReasons = ['spam', 'harassment', 'unsafe', 'other'];
    if (!validReasons.includes(reason)) {
        return res.status(400).json({ error: `reason must be one of: ${validReasons.join(', ')}` });
    }
    if (target_user_id === reporter_id) {
        return res.status(400).json({ error: 'Cannot report yourself.' });
    }

    try {
        // Verify target exists
        const { rows: targetRows } = await pool.query('SELECT id FROM users WHERE id = $1', [target_user_id]);
        if (!targetRows.length) return res.status(404).json({ error: 'Target user not found.' });

        const { rows } = await pool.query(
            'INSERT INTO reports (reporter_id, target_user_id, reason, details) VALUES ($1, $2, $3, $4) RETURNING *',
            [reporter_id, target_user_id, reason, details?.trim() || null]
        );
        res.status(201).json({ report: rows[0] });
    } catch (err) {
        console.error('POST /reports error:', err.message);
        res.status(500).json({ error: 'Failed to submit report.' });
    }
});

module.exports = router;
