require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function migrate() {
    const sql = fs.readFileSync(
        path.join(__dirname, 'migrations', '001_schema.sql'),
        'utf8'
    );
    try {
        await pool.query(sql);
        console.log('✅ Migration complete.');
    } catch (err) {
        console.error('Migration error:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
