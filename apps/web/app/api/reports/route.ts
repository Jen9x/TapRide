import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/auth-server';
import { v4 as uuidv4 } from 'uuid';

// POST /api/reports — file a report
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return unauthorized();

    const { target_user_id, reason, details } = await req.json();
    if (!target_user_id || !reason) {
        return NextResponse.json({ error: 'target_user_id and reason required.' }, { status: 400 });
    }
    if (!['spam', 'harassment', 'unsafe', 'other'].includes(reason)) {
        return NextResponse.json({ error: 'Invalid reason.' }, { status: 400 });
    }

    try {
        const reportId = uuidv4();
        await pool.query(
            'INSERT INTO reports (id, reporter_id, target_user_id, reason, details) VALUES ($1, $2, $3, $4, $5)',
            [reportId, user.id, target_user_id, reason, details || null]
        );
        return NextResponse.json({ message: 'Report filed.', report_id: reportId }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Failed.' }, { status: 500 });
    }
}
