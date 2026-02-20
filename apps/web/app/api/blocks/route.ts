import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/auth-server';
import { v4 as uuidv4 } from 'uuid';

// GET /api/blocks — list blocked users
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return unauthorized();

    const { rows } = await pool.query(
        'SELECT b.id, b.blocked_id, u.phone_number FROM blocks b JOIN users u ON u.id = b.blocked_id WHERE b.blocker_id = $1',
        [user.id]
    );
    return NextResponse.json({ blocks: rows });
}

// POST /api/blocks — block a user
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return unauthorized();

    const { blocked_id } = await req.json();
    if (!blocked_id) return NextResponse.json({ error: 'blocked_id required.' }, { status: 400 });

    try {
        const blockId = uuidv4();
        await pool.query('INSERT INTO blocks (id, blocker_id, blocked_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [blockId, user.id, blocked_id]);
        return NextResponse.json({ message: 'Blocked.' }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Failed.' }, { status: 500 });
    }
}
