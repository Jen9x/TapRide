import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/auth-server';
import { v4 as uuidv4 } from 'uuid';

// GET /api/reviews/[driverId] — get reviews for a driver
export async function GET(req: NextRequest, { params }: { params: { driverId: string } }) {
    try {
        const { rows } = await pool.query(
            `SELECT r.id, r.stars, r.comment, r.created_at, u.phone_number AS passenger_phone
             FROM reviews r JOIN users u ON u.id = r.passenger_id
             WHERE r.driver_id = $1 ORDER BY r.created_at DESC`,
            [params.driverId]
        );
        const reviews = rows.map(r => ({
            ...r,
            passenger_phone: r.passenger_phone ? '****' + r.passenger_phone.slice(-4) : null,
        }));
        return NextResponse.json({ reviews });
    } catch {
        return NextResponse.json({ error: 'Failed.' }, { status: 500 });
    }
}
