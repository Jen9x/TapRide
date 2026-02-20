const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Verify JWT and attach user to req.user
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: no token' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Re-fetch user to check ban status
        const { rows } = await pool.query(
            'SELECT id, phone_number, role, is_admin, is_banned FROM users WHERE id = $1',
            [decoded.userId]
        );
        if (!rows.length) return res.status(401).json({ error: 'User not found' });
        if (rows[0].is_banned) return res.status(403).json({ error: 'Account suspended' });
        req.user = rows[0];
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// Must be used after requireAuth
function requireAdmin(req, res, next) {
    if (!req.user?.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user?.role)) {
            return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` });
        }
        next();
    };
}

module.exports = { requireAuth, requireAdmin, requireRole };
