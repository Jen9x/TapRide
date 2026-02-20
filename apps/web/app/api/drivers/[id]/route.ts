import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const user = await getAuthUser(req);
    if (!user) return unauthorized();

    try {
        const { rows } = await pool.query(`
            SELECT u.id, u.phone_number, dp.display_name, dp.photo_url, dp.car_make_model,
                   dp.bio, dp.allow_calls, dp.rating_avg, dp.rating_count, ds.status, ds.last_updated
            FROM users u
            JOIN driver_profiles dp ON dp.user_id = u.id
            JOIN driver_status ds ON ds.driver_id = u.id
            WHERE u.id = $1
        `, [params.id]);

        if (!rows[0]) return NextResponse.json({ error: 'Driver not found.' }, { status: 404 });
        const d = rows[0];
        return NextResponse.json({
            driver: {
                id: d.id, display_name: d.display_name, photo_url: d.photo_url,
                car_make_model: d.car_make_model, bio: d.bio, allow_calls: d.allow_calls,
                rating_avg: parseFloat(d.rating_avg) || 0, rating_count: d.rating_count,
                status: d.status,
                phone_number: (d.status === 'available' && d.allow_calls) ? d.phone_number : null,
            }
        });
    } catch {
        return NextResponse.json({ error: 'Failed.' }, { status: 500 });
    }
}
