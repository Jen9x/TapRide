const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /reviews/:driverId — get reviews for a driver
router.get('/:driverId', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT
        r.id, r.stars, r.comment, r.created_at,
        r.passenger_id,
        u.phone_number AS passenger_phone
      FROM reviews r
      JOIN users u ON u.id = r.passenger_id
      WHERE r.driver_id = $1
      ORDER BY r.created_at DESC
    `, [req.params.driverId]);
        // Mask passenger phone for privacy — only show last 4
        const reviews = rows.map(r => ({
            id: r.id,
            stars: r.stars,
            comment: r.comment,
            created_at: r.created_at,
            passenger_id: r.passenger_id,
            passenger_label: 'Passenger …' + r.passenger_phone.slice(-4),
        }));
        res.json({ reviews });
    } catch (err) {
        console.error('GET /reviews/:driverId error:', err.message);
        res.status(500).json({ error: 'Failed to fetch reviews.' });
    }
});

// POST /reviews — submit a review (passenger only, 1 per driver per 24h)
router.post('/', requireAuth, requireRole('passenger', 'admin'), async (req, res) => {
    const { driver_id, stars, comment } = req.body;
    const passenger_id = req.user.id;

    if (!driver_id || !stars) {
        return res.status(400).json({ error: 'driver_id and stars are required.' });
    }
    if (stars < 1 || stars > 5 || !Number.isInteger(Number(stars))) {
        return res.status(400).json({ error: 'stars must be an integer between 1 and 5.' });
    }
    if (comment && comment.length > 300) {
        return res.status(400).json({ error: 'comment must be 300 characters or less.' });
    }
    if (passenger_id === driver_id) {
        return res.status(400).json({ error: 'You cannot review yourself.' });
    }

    try {
        // Rate-limit: 1 review per passenger per driver per 24 hours
        const { rows: recent } = await pool.query(`
      SELECT id FROM reviews
      WHERE driver_id = $1 AND passenger_id = $2
        AND created_at > NOW() - INTERVAL '24 hours'
      LIMIT 1
    `, [driver_id, passenger_id]);

        if (recent.length) {
            return res.status(429).json({ error: 'You can only leave one review per driver per 24 hours.' });
        }

        // Verify driver exists
        const { rows: driverRows } = await pool.query(
            'SELECT id FROM users WHERE id = $1 AND role IN (\'driver\')',
            [driver_id]
        );
        if (!driverRows.length) {
            return res.status(404).json({ error: 'Driver not found.' });
        }

        // Insert review
        const { rows } = await pool.query(
            'INSERT INTO reviews (driver_id, passenger_id, stars, comment) VALUES ($1, $2, $3, $4) RETURNING *',
            [driver_id, passenger_id, Number(stars), comment?.trim() || null]
        );

        // Recalculate driver rating
        await pool.query(`
      UPDATE driver_profiles dp
      SET rating_avg = (SELECT AVG(stars) FROM reviews WHERE driver_id = $1),
          rating_count = (SELECT COUNT(*) FROM reviews WHERE driver_id = $1)
      WHERE dp.user_id = $1
    `, [driver_id]);

        res.status(201).json({ review: rows[0] });
    } catch (err) {
        console.error('POST /reviews error:', err.message);
        res.status(500).json({ error: 'Failed to submit review.' });
    }
});

module.exports = router;
