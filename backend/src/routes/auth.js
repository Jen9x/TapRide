const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

let twilioClient = null;
function getTwilio() {
    if (!twilioClient) {
        const twilio = require('twilio');
        twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }
    return twilioClient;
}

// POST /auth/send-otp
// Body: { phone_number: "+1..." }
router.post('/send-otp', async (req, res) => {
    const { phone_number } = req.body;
    if (!phone_number || !/^\+[1-9]\d{7,14}$/.test(phone_number)) {
        return res.status(400).json({ error: 'Invalid phone number. Must be E.164 format (e.g. +12125551234).' });
    }

    // Dev bypass
    if (process.env.DEV_OTP_BYPASS) {
        return res.json({ success: true, dev: true });
    }

    try {
        await getTwilio().verify.v2
            .services(process.env.TWILIO_VERIFY_SERVICE_SID)
            .verifications.create({ to: phone_number, channel: 'sms' });
        res.json({ success: true });
    } catch (err) {
        console.error('Twilio send-otp error:', err.message);
        res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
    }
});

// POST /auth/verify-otp
// Body: { phone_number, code, role?: "driver"|"passenger", display_name?: string }
// - First-time users: creates account (role required)
// - Returning users: logs in
router.post('/verify-otp', async (req, res) => {
    const { phone_number, code, role, display_name } = req.body;
    if (!phone_number || !code) {
        return res.status(400).json({ error: 'phone_number and code are required.' });
    }

    // Dev bypass
    if (process.env.DEV_OTP_BYPASS && code === process.env.DEV_OTP_BYPASS) {
        // bypass validation, fall through to user lookup/creation
    } else {
        try {
            const check = await getTwilio().verify.v2
                .services(process.env.TWILIO_VERIFY_SERVICE_SID)
                .verificationChecks.create({ to: phone_number, code });
            if (check.status !== 'approved') {
                return res.status(401).json({ error: 'Invalid or expired OTP code.' });
            }
        } catch (err) {
            console.error('Twilio verify error:', err.message);
            return res.status(500).json({ error: 'OTP verification failed.' });
        }
    }

    try {
        // Check existing user
        let { rows } = await pool.query(
            'SELECT id, phone_number, role, is_admin, is_banned FROM users WHERE phone_number = $1',
            [phone_number]
        );

        let user = rows[0];
        let isNew = false;

        if (!user) {
            // New user — require role
            if (!role || !['driver', 'passenger'].includes(role)) {
                return res.status(400).json({ error: 'New user: role ("driver" or "passenger") is required.', new_user: true });
            }

            // Check if this phone is in admin list
            const adminPhones = (process.env.ADMIN_PHONES || '').split(',').map(p => p.trim());
            const isAdmin = adminPhones.includes(phone_number);

            const insertResult = await pool.query(
                'INSERT INTO users (phone_number, phone_verified, role, is_admin) VALUES ($1, TRUE, $2, $3) RETURNING id, phone_number, role, is_admin',
                [phone_number, isAdmin ? 'admin' : role, isAdmin]
            );
            user = insertResult.rows[0];
            isNew = true;

            // If driver, auto-create profile and status row
            if (role === 'driver') {
                const name = display_name || 'Driver';
                await pool.query(
                    'INSERT INTO driver_profiles (user_id, display_name) VALUES ($1, $2)',
                    [user.id, name]
                );
                await pool.query(
                    'INSERT INTO driver_status (driver_id, status) VALUES ($1, $2)',
                    [user.id, 'offline']
                );
            }
        } else {
            // Update phone_verified if not already
            await pool.query('UPDATE users SET phone_verified = TRUE WHERE id = $1', [user.id]);
            if (user.is_banned) {
                return res.status(403).json({ error: 'This account has been suspended.' });
            }
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role, isAdmin: user.is_admin },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            token,
            user: { id: user.id, role: user.role, is_admin: user.is_admin, phone_number: user.phone_number },
            new_user: isNew,
        });
    } catch (err) {
        console.error('verify-otp db error:', err.message);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

module.exports = router;
