import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/auth-server';

function effectiveStatus(status: string, lastUpdated: string): string {
    if (status !== 'available') return status;
    const diff = Date.now() - new Date(lastUpdated).getTime();
    if (diff > 2 * 60 * 60 * 1000) return 'offline';
    return 'available';
}

export async function GET(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return unauthorized();

    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
    const availableOnly = url.searchParams.get('available_only') === 'true';

    try {
        // Get blocked user IDs
        const { rows: blockRows } = await pool.query(
            'SELECT blocked_id FROM blocks WHERE blocker_id = $1 UNION SELECT blocker_id FROM blocks WHERE blocked_id = $1',
            [user.id]
        );
        const blockedIds = blockRows.map(b => b.blocked_id || b.blocker_id);

        let query = `
            SELECT u.id, u.phone_number, dp.display_name, dp.photo_url, dp.car_make_model,
                   dp.bio, dp.allow_calls, dp.rating_avg, dp.rating_count, ds.status, ds.last_updated
            FROM users u
            JOIN driver_profiles dp ON dp.user_id = u.id
            JOIN driver_status ds ON ds.driver_id = u.id
            WHERE u.role IN ('driver', 'admin') AND u.is_banned = FALSE
        `;
        const params: any[] = [];

        if (blockedIds.length > 0) {
            const placeholders = blockedIds.map((_, i) => `$${params.length + i + 1}`).join(',');
            query += ` AND u.id NOT IN (${placeholders})`;
            params.push(...blockedIds);
        }

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (dp.display_name ILIKE $${params.length} OR dp.car_make_model ILIKE $${params.length})`;
        }

        query += ' ORDER BY dp.rating_avg DESC, dp.display_name ASC';

        const { rows } = await pool.query(query, params);

        const drivers = rows.map(d => {
            const effStatus = effectiveStatus(d.status, d.last_updated);
            return {
                id: d.id,
                display_name: d.display_name,
                photo_url: d.photo_url,
                car_make_model: d.car_make_model,
                bio: d.bio,
                allow_calls: d.allow_calls,
                rating_avg: parseFloat(d.rating_avg) || 0,
                rating_count: d.rating_count,
                status: effStatus,
                phone_number: (effStatus === 'available' && d.allow_calls) ? d.phone_number : null,
            };
        }).filter(d => !availableOnly || d.status === 'available');

        return NextResponse.json({ drivers });
    } catch (err: any) {
        return NextResponse.json({ error: 'Failed to fetch drivers.' }, { status: 500 });
    }
}
