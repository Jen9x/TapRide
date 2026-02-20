import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/auth-server';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const user = await getAuthUser(req);
    if (!user || user.id !== params.id) return unauthorized();

    try {
        const { allow_calls } = await req.json();
        await pool.query('UPDATE driver_profiles SET allow_calls = $1, updated_at = NOW() WHERE user_id = $2', [!!allow_calls, params.id]);
        return NextResponse.json({ allow_calls: !!allow_calls });
    } catch {
        return NextResponse.json({ error: 'Failed.' }, { status: 500 });
    }
}
