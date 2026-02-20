import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/auth-server';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const user = await getAuthUser(req);
    if (!user || user.id !== params.id) return unauthorized();

    try {
        const body = await req.json();
        const updates: string[] = [];
        const values: any[] = [];
        let idx = 1;

        if (body.display_name) { updates.push(`display_name = $${idx++}`); values.push(body.display_name); }
        if (body.photo_url !== undefined) { updates.push(`photo_url = $${idx++}`); values.push(body.photo_url); }
        if (body.car_make_model !== undefined) { updates.push(`car_make_model = $${idx++}`); values.push(body.car_make_model); }
        if (body.bio !== undefined) { updates.push(`bio = $${idx++}`); values.push(body.bio); }

        if (updates.length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

        values.push(params.id);
        await pool.query(`UPDATE driver_profiles SET ${updates.join(', ')}, updated_at = NOW() WHERE user_id = $${idx}`, values);

        return NextResponse.json({ message: 'Profile updated.' });
    } catch {
        return NextResponse.json({ error: 'Failed.' }, { status: 500 });
    }
}
