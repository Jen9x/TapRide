require('dotenv').config();
const { Pool } = require('pg');

async function clearAll() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await pool.query('DELETE FROM reviews');
        await pool.query('DELETE FROM blocks');
        await pool.query('DELETE FROM reports');
        await pool.query('DELETE FROM driver_status');
        await pool.query('DELETE FROM driver_profiles');
        await pool.query('DELETE FROM users');
        console.log('✅ All seed data cleared — database is clean.');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

clearAll();
