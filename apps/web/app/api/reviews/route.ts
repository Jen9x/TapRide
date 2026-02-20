import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/auth-server';
import { v4 as uuidv4 } from 'uuid';

// POST /api/reviews — submit a review
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return unauthorized();

    try {
        const { driver_id, stars, comment } = await req.json();
        if (!driver_id || !stars || stars < 1 || stars > 5) {
            return NextResponse.json({ error: 'driver_id and stars (1-5) required.' }, { status: 400 });
        }

        // Check 24h limit
        const { rows: recent } = await pool.query(
            `SELECT id FROM reviews WHERE driver_id = $1 AND passenger_id = $2 AND created_at > NOW() - INTERVAL '24 hours'`,
            [driver_id, user.id]
        );
        if (recent.length > 0) {
            return NextResponse.json({ error: 'You already reviewed this driver in the last 24 hours.' }, { status: 429 });
        }

        const reviewId = uuidv4();
        await pool.query(
            'INSERT INTO reviews (id, driver_id, passenger_id, stars, comment) VALUES ($1, $2, $3, $4, $5)',
            [reviewId, driver_id, user.id, stars, comment || null]
        );

        // Recalculate rating
        const { rows: stats } = await pool.query(
            'SELECT AVG(stars)::numeric(3,2) AS avg, COUNT(*)::int AS cnt FROM reviews WHERE driver_id = $1',
            [driver_id]
        );
        await pool.query(
            'UPDATE driver_profiles SET rating_avg = $1, rating_count = $2 WHERE user_id = $3',
            [stats[0].avg, stats[0].cnt, driver_id]
        );

        return NextResponse.json({ message: 'Review submitted.', review_id: reviewId }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: 'Failed.' }, { status: 500 });
    }
}
