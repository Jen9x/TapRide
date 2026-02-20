import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth-server';

// PATCH /api/admin/users/[id]/ban — ban or unban a user
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const user = await getAuthUser(req);
    if (!user) return unauthorized();
    if (!user.is_admin) return forbidden();

    const { is_banned } = await req.json();
    await pool.query('UPDATE users SET is_banned = $1 WHERE id = $2', [!!is_banned, params.id]);
    return NextResponse.json({ message: is_banned ? 'User banned.' : 'User unbanned.' });
}
