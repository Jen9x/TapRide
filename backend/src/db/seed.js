require('dotenv').config();
const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

async function seed() {
    console.log('🌱 Seeding database...');

    try {
        // ─── 2 Drivers ──────────────────────────────────────────────────────────
        const driver1Id = uuidv4();
        const driver2Id = uuidv4();

        await pool.query(`
      INSERT INTO users (id, phone_number, phone_verified, role)
      VALUES
        ($1, '+11111111111', TRUE, 'driver'),
        ($2, '+12222222222', TRUE, 'driver')
      ON CONFLICT (phone_number) DO NOTHING
    `, [driver1Id, driver2Id]);

        await pool.query(`
      INSERT INTO driver_profiles (user_id, display_name, car_make_model, bio, allow_calls)
      VALUES
        ($1, 'Alex Rivera', 'Toyota Camry 2022', 'Safe and punctual driver. Happy to help fellow students!', TRUE),
        ($2, 'Casey Morgan', 'Honda Civic 2020', 'Music lover, clean car. Available most evenings.', TRUE)
      ON CONFLICT (user_id) DO NOTHING
    `, [driver1Id, driver2Id]);

        await pool.query(`
      INSERT INTO driver_status (driver_id, status, last_updated)
      VALUES
        ($1, 'available', NOW()),
        ($2, 'busy', NOW())
      ON CONFLICT (driver_id) DO UPDATE SET status = EXCLUDED.status, last_updated = EXCLUDED.last_updated
    `, [driver1Id, driver2Id]);

        // ─── 2 Passengers ────────────────────────────────────────────────────────
        const pass1Id = uuidv4();
        const pass2Id = uuidv4();

        await pool.query(`
      INSERT INTO users (id, phone_number, phone_verified, role)
      VALUES
        ($1, '+13333333333', TRUE, 'passenger'),
        ($2, '+14444444444', TRUE, 'passenger')
      ON CONFLICT (phone_number) DO NOTHING
    `, [pass1Id, pass2Id]);

        // ─── Sample review on available driver ───────────────────────────────────
        await pool.query(`
      INSERT INTO reviews (driver_id, passenger_id, stars, comment)
      VALUES ($1, $2, 5, 'Alex was amazing – on time and super friendly!')
      ON CONFLICT DO NOTHING
    `, [driver1Id, pass1Id]);

        // Update rating_avg for driver1
        await pool.query(`
      UPDATE driver_profiles
      SET rating_avg = 5.0, rating_count = 1
      WHERE user_id = $1
    `, [driver1Id]);

        console.log('✅ Seed complete!');
        console.log('   Driver 1 (Available): Alex Rivera — +1 111 111 1111');
        console.log('   Driver 2 (Busy):      Casey Morgan — +1 222 222 2222');
        console.log('   Passenger 1:          +1 333 333 3333');
        console.log('   Passenger 2:          +1 444 444 4444');
    } catch (err) {
        console.error('Seed error:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

seed();
