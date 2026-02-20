import { NextResponse } from 'next/server';
import pool from '@/lib/db';

function effectiveStatus(status: string, lastUpdated: string): string {
    if (status !== 'available') return status;
    const diff = Date.now() - new Date(lastUpdated).getTime();
    if (diff > 2 * 60 * 60 * 1000) return 'offline';
    return 'available';
}

export async function GET() {
    try {
        const { rows } = await pool.query(`
            SELECT u.id, dp.display_name, dp.photo_url, dp.car_make_model,
                   dp.bio, dp.rating_avg, dp.rating_count, ds.status, ds.last_updated
            FROM users u
            JOIN driver_profiles dp ON dp.user_id = u.id
            JOIN driver_status ds ON ds.driver_id = u.id
            WHERE u.role IN ('driver', 'admin') AND u.is_banned = FALSE
            ORDER BY dp.rating_avg DESC, dp.display_name ASC
        `);

        const drivers = rows.map(d => ({
            id: d.id,
            display_name: d.display_name,
            photo_url: d.photo_url,
            car_make_model: d.car_make_model,
            bio: d.bio,
            rating_avg: parseFloat(d.rating_avg) || 0,
            rating_count: d.rating_count,
            status: effectiveStatus(d.status, d.last_updated),
        }));

        return NextResponse.json({ drivers });
    } catch (err: any) {
        return NextResponse.json({ error: 'Failed to fetch drivers.' }, { status: 500 });
    }
}
