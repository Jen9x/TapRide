import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/auth-server';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const user = await getAuthUser(req);
    if (!user || user.id !== params.id) return unauthorized();

    try {
        const { status } = await req.json();
        if (!['available', 'busy', 'offline'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
        }
        await pool.query('UPDATE driver_status SET status = $1, last_updated = NOW() WHERE driver_id = $2', [status, params.id]);
        return NextResponse.json({ status });
    } catch {
        return NextResponse.json({ error: 'Failed.' }, { status: 500 });
    }
}
