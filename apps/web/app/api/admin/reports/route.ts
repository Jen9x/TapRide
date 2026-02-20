import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth-server';

// GET /api/admin/reports — list all reports
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return unauthorized();
    if (!user.is_admin) return forbidden();

    const { rows } = await pool.query(`
        SELECT r.*, u.phone_number AS reporter_phone, t.phone_number AS target_phone, t.is_banned AS target_banned
        FROM reports r
        JOIN users u ON u.id = r.reporter_id
        JOIN users t ON t.id = r.target_user_id
        ORDER BY r.created_at DESC
    `);
    return NextResponse.json({ reports: rows });
}
