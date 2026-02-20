import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth-server';

// PATCH /api/admin/reports/[id] — resolve/reopen report
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const user = await getAuthUser(req);
    if (!user) return unauthorized();
    if (!user.is_admin) return forbidden();

    const { status } = await req.json();
    if (!['open', 'resolved'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }
    await pool.query('UPDATE reports SET status = $1 WHERE id = $2', [status, params.id]);
    return NextResponse.json({ message: 'Updated.' });
}
