import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth-server';

// GET /api/admin/users — list all users
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return unauthorized();
    if (!user.is_admin) return forbidden();

    const { rows } = await pool.query('SELECT id, phone_number, role, is_admin, is_banned, created_at FROM users ORDER BY created_at DESC');
    return NextResponse.json({ users: rows });
}
