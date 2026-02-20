require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST'],
    },
});

// Make io accessible to routes
app.set('io', io);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
}));
app.use(express.json());

// Global rate limiter — 200 requests per 15 minutes per IP
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
}));

// Stricter limiter for auth routes (OTP abuse prevention)
const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: { error: 'Too many auth requests. Please wait 10 minutes.' },
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth', authLimiter, require('./routes/auth'));
app.use('/drivers', require('./routes/drivers'));
app.use('/reviews', require('./routes/reviews'));
app.use('/blocks', require('./routes/blocks'));
app.use('/reports', require('./routes/reports'));
app.use('/admin', require('./routes/admin'));

// Health check
app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// 404 fallback
app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error.' });
});

// ── Socket.io ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
    // Drivers can join a room to broadcast status updates in real-time
    socket.on('join_driver_room', (driverId) => {
        socket.join(`driver:${driverId}`);
    });

    socket.on('disconnect', () => {
        // Client disconnected — no cleanup needed for this MVP
    });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`🚀 RideShare backend running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   OTP bypass code: ${process.env.DEV_OTP_BYPASS ? '✅ ENABLED (dev only)' : '❌ disabled'}`);
});
