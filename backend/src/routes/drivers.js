const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

// Helper: get effective status (auto-offline after 60 min of no update)
function effectiveStatus(status, lastUpdated) {
    if (status !== 'available') return status;
    const diffMs = Date.now() - new Date(lastUpdated).getTime();
    if (diffMs > 60 * 60 * 1000) return 'offline';
    return 'available';
}

// GET /drivers/public — public driver list (no auth, no phone numbers)
router.get('/public', async (req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT
        u.id,
        dp.display_name,
        dp.photo_url,
        dp.car_make_model,
        dp.bio,
        dp.rating_avg,
        dp.rating_count,
        ds.status,
        ds.last_updated
      FROM users u
      JOIN driver_profiles dp ON dp.user_id = u.id
      JOIN driver_status ds ON ds.driver_id = u.id
      WHERE u.role IN ('driver', 'admin')
        AND u.is_banned = FALSE
      ORDER BY dp.rating_avg DESC, dp.display_name ASC
    `);

        const drivers = rows.map(d => {
            const effStatus = effectiveStatus(d.status, d.last_updated);
            return {
                id: d.id,
                display_name: d.display_name,
                photo_url: d.photo_url,
                car_make_model: d.car_make_model,
                bio: d.bio,
                rating_avg: parseFloat(d.rating_avg) || 0,
                rating_count: d.rating_count,
                status: effStatus,
            };
        });

        res.json({ drivers });
    } catch (err) {
        console.error('GET /drivers/public error:', err.message);
        res.status(500).json({ error: 'Failed to fetch drivers.' });
    }
});

// GET /drivers — list drivers (block-filtered)
// Public route but phone number only exposed to logged-in users when driver is available+allow_calls
router.get('/', requireAuth, async (req, res) => {
    const { search, available_only } = req.query;
    const userId = req.user.id;

    try {
        // Exclude drivers that have blocked this passenger, or that this passenger has blocked
        const { rows } = await pool.query(`
      SELECT
        u.id,
        dp.display_name,
        dp.photo_url,
        dp.car_make_model,
        dp.bio,
        dp.allow_calls,
        dp.rating_avg,
        dp.rating_count,
        ds.status,
        ds.last_updated,
        u.phone_number
      FROM users u
      JOIN driver_profiles dp ON dp.user_id = u.id
      JOIN driver_status ds ON ds.driver_id = u.id
      WHERE u.role IN ('driver', 'admin')
        AND u.is_banned = FALSE
        AND u.id NOT IN (
          -- drivers that have blocked this user
          SELECT blocked_id FROM blocks WHERE blocker_id = $1
          UNION
          -- drivers that this user has blocked
          SELECT blocker_id FROM blocks WHERE blocked_id = $1
        )
        AND ($2::text IS NULL OR LOWER(dp.display_name) LIKE LOWER('%' || $2 || '%'))
      ORDER BY dp.rating_avg DESC, dp.display_name ASC
    `, [userId, search || null]);

        const drivers = rows.map(d => {
            const effStatus = effectiveStatus(d.status, d.last_updated);
            const showPhone = effStatus === 'available' && d.allow_calls;
            return {
                id: d.id,
                display_name: d.display_name,
                photo_url: d.photo_url,
                car_make_model: d.car_make_model,
                bio: d.bio,
                allow_calls: d.allow_calls,
                rating_avg: parseFloat(d.rating_avg) || 0,
                rating_count: d.rating_count,
                status: effStatus,
                phone_number: showPhone ? d.phone_number : null,
            };
        });

        const filtered = available_only === 'true'
            ? drivers.filter(d => d.status === 'available')
            : drivers;

        res.json({ drivers: filtered });
    } catch (err) {
        console.error('GET /drivers error:', err.message);
        res.status(500).json({ error: 'Failed to fetch drivers.' });
    }
});

// GET /drivers/:id — single driver profile
router.get('/:id', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const driverId = req.params.id;

    try {
        // Check if one has blocked the other
        const { rows: blockRows } = await pool.query(`
      SELECT id FROM blocks
      WHERE (blocker_id = $1 AND blocked_id = $2)
         OR (blocker_id = $2 AND blocked_id = $1)
      LIMIT 1
    `, [userId, driverId]);
        if (blockRows.length) {
            return res.status(403).json({ error: 'Profile not available.' });
        }

        const { rows } = await pool.query(`
      SELECT
        u.id, u.phone_number,
        dp.display_name, dp.photo_url, dp.car_make_model, dp.bio, dp.allow_calls,
        dp.rating_avg, dp.rating_count,
        ds.status, ds.last_updated
      FROM users u
      JOIN driver_profiles dp ON dp.user_id = u.id
      JOIN driver_status ds ON ds.driver_id = u.id
      WHERE u.id = $1 AND u.role IN ('driver', 'admin') AND u.is_banned = FALSE
    `, [driverId]);

        if (!rows.length) return res.status(404).json({ error: 'Driver not found.' });

        const d = rows[0];
        const effStatus = effectiveStatus(d.status, d.last_updated);
        const showPhone = effStatus === 'available' && d.allow_calls;

        res.json({
            id: d.id,
            display_name: d.display_name,
            photo_url: d.photo_url,
            car_make_model: d.car_make_model,
            bio: d.bio,
            allow_calls: d.allow_calls,
            rating_avg: parseFloat(d.rating_avg) || 0,
            rating_count: d.rating_count,
            status: effStatus,
            phone_number: showPhone ? d.phone_number : null,
        });
    } catch (err) {
        console.error('GET /drivers/:id error:', err.message);
        res.status(500).json({ error: 'Failed to fetch driver.' });
    }
});

// PATCH /drivers/:id/status — driver updates own status
router.patch('/:id/status', requireAuth, requireRole('driver', 'admin'), async (req, res) => {
    if (req.params.id !== req.user.id) {
        return res.status(403).json({ error: 'Can only update your own status.' });
    }
    const { status } = req.body;
    if (!['available', 'busy', 'offline'].includes(status)) {
        return res.status(400).json({ error: 'status must be available, busy, or offline.' });
    }
    try {
        await pool.query(
            'UPDATE driver_status SET status = $1, last_updated = NOW() WHERE driver_id = $2',
            [status, req.user.id]
        );
        // Emit socket event (attached to req.app if socket.io is set up)
        if (req.app.get('io')) {
            req.app.get('io').emit('driver_status_update', { driver_id: req.user.id, status });
        }
        res.json({ success: true, status });
    } catch (err) {
        console.error('PATCH /drivers/:id/status error:', err.message);
        res.status(500).json({ error: 'Failed to update status.' });
    }
});

// PATCH /drivers/:id/profile — driver edits own profile
router.patch('/:id/profile', requireAuth, requireRole('driver', 'admin'), async (req, res) => {
    if (req.params.id !== req.user.id) {
        return res.status(403).json({ error: 'Can only update your own profile.' });
    }
    const { display_name, photo_url, car_make_model, bio } = req.body;
    if (!display_name || display_name.trim().length < 2) {
        return res.status(400).json({ error: 'display_name must be at least 2 characters.' });
    }
    try {
        await pool.query(
            `UPDATE driver_profiles
       SET display_name = $1, photo_url = $2, car_make_model = $3, bio = $4, updated_at = NOW()
       WHERE user_id = $5`,
            [display_name.trim(), photo_url || null, car_make_model || null, bio || null, req.user.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('PATCH /drivers/:id/profile error:', err.message);
        res.status(500).json({ error: 'Failed to update profile.' });
    }
});

// PATCH /drivers/:id/allow-calls — toggle allow_calls
router.patch('/:id/allow-calls', requireAuth, requireRole('driver', 'admin'), async (req, res) => {
    if (req.params.id !== req.user.id) {
        return res.status(403).json({ error: 'Can only update your own settings.' });
    }
    const { allow_calls } = req.body;
    if (typeof allow_calls !== 'boolean') {
        return res.status(400).json({ error: 'allow_calls must be boolean.' });
    }
    try {
        await pool.query(
            'UPDATE driver_profiles SET allow_calls = $1 WHERE user_id = $2',
            [allow_calls, req.user.id]
        );
        res.json({ success: true, allow_calls });
    } catch (err) {
        console.error('PATCH /drivers/:id/allow-calls error:', err.message);
        res.status(500).json({ error: 'Failed to update allow_calls.' });
    }
});

module.exports = router;
