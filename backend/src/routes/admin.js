const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// All admin routes require auth + admin
router.use(requireAuth, requireAdmin);

// GET /admin/reports — list all reports
router.get('/reports', async (req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT
        r.id, r.reason, r.details, r.status, r.created_at,
        reporter.phone_number AS reporter_phone,
        reporter.id AS reporter_id,
        target.phone_number AS target_phone,
        target.id AS target_id,
        target.role AS target_role,
        target.is_banned AS target_banned
      FROM reports r
      JOIN users reporter ON reporter.id = r.reporter_id
      JOIN users target ON target.id = r.target_user_id
      ORDER BY r.status ASC, r.created_at DESC
    `);
        res.json({ reports: rows });
    } catch (err) {
        console.error('GET /admin/reports error:', err.message);
        res.status(500).json({ error: 'Failed to fetch reports.' });
    }
});

// PATCH /admin/reports/:id — mark report as resolved
router.patch('/reports/:id', async (req, res) => {
    const { status } = req.body;
    if (!['open', 'resolved'].includes(status)) {
        return res.status(400).json({ error: 'status must be open or resolved.' });
    }
    try {
        const { rowCount } = await pool.query(
            'UPDATE reports SET status = $1 WHERE id = $2',
            [status, req.params.id]
        );
        if (!rowCount) return res.status(404).json({ error: 'Report not found.' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update report.' });
    }
});

// PATCH /admin/users/:id/ban — ban or unban a user
router.patch('/users/:id/ban', async (req, res) => {
    const { is_banned } = req.body;
    if (typeof is_banned !== 'boolean') {
        return res.status(400).json({ error: 'is_banned must be boolean.' });
    }
    try {
        const { rowCount } = await pool.query(
            'UPDATE users SET is_banned = $1 WHERE id = $2',
            [is_banned, req.params.id]
        );
        if (!rowCount) return res.status(404).json({ error: 'User not found.' });
        res.json({ success: true, is_banned });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update ban status.' });
    }
});

// DELETE /admin/reviews/:id — delete a review (moderation)
router.delete('/reviews/:id', async (req, res) => {
    try {
        // Get driver_id before deleting so we can recalculate
        const { rows } = await pool.query('SELECT driver_id FROM reviews WHERE id = $1', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Review not found.' });

        const driver_id = rows[0].driver_id;
        await pool.query('DELETE FROM reviews WHERE id = $1', [req.params.id]);

        // Recalculate driver rating
        await pool.query(`
      UPDATE driver_profiles
      SET
        rating_avg = COALESCE((SELECT AVG(stars) FROM reviews WHERE driver_id = $1), 0),
        rating_count = (SELECT COUNT(*) FROM reviews WHERE driver_id = $1)
      WHERE user_id = $1
    `, [driver_id]);

        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /admin/reviews/:id error:', err.message);
        res.status(500).json({ error: 'Failed to delete review.' });
    }
});

// GET /admin/users — list all users
router.get('/users', async (req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT u.id, u.phone_number, u.role, u.is_banned, u.is_admin, u.created_at,
             dp.display_name
      FROM users u
      LEFT JOIN driver_profiles dp ON dp.user_id = u.id
      ORDER BY u.created_at DESC
    `);
        res.json({ users: rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

module.exports = router;
