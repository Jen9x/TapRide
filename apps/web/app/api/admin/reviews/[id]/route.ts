import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth-server';

// DELETE /api/admin/reviews/[id] — delete a review and recalculate
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const user = await getAuthUser(req);
    if (!user) return unauthorized();
    if (!user.is_admin) return forbidden();

    // Get driver_id before deleting
    const { rows } = await pool.query('SELECT driver_id FROM reviews WHERE id = $1', [params.id]);
    if (!rows[0]) return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
    const driverId = rows[0].driver_id;

    await pool.query('DELETE FROM reviews WHERE id = $1', [params.id]);

    // Recalculate
    const { rows: stats } = await pool.query(
        'SELECT COALESCE(AVG(stars), 0)::numeric(3,2) AS avg, COUNT(*)::int AS cnt FROM reviews WHERE driver_id = $1',
        [driverId]
    );
    await pool.query('UPDATE driver_profiles SET rating_avg = $1, rating_count = $2 WHERE user_id = $3', [stats[0].avg, stats[0].cnt, driverId]);

    return NextResponse.json({ message: 'Review deleted.' });
}
