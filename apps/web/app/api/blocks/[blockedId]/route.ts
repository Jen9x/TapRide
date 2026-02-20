import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/auth-server';

// DELETE /api/blocks/[blockedId] — unblock a user
export async function DELETE(req: NextRequest, { params }: { params: { blockedId: string } }) {
    const user = await getAuthUser(req);
    if (!user) return unauthorized();

    await pool.query('DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2', [user.id, params.blockedId]);
    return NextResponse.json({ message: 'Unblocked.' });
}
