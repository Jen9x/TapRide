import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { signToken } from '@/lib/auth-server';

const client = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

const ADMIN_PHONES = (process.env.ADMIN_PHONES || '').split(',').map(p => p.trim()).filter(Boolean);

export async function POST(req: NextRequest) {
    try {
        const { phone_number, code, role, display_name } = await req.json();

        if (!phone_number || !code) {
            return NextResponse.json({ error: 'Phone number and code required.' }, { status: 400 });
        }

        // Verify OTP
        if (process.env.DEV_OTP_BYPASS) {
            if (code !== process.env.DEV_OTP_BYPASS) {
                return NextResponse.json({ error: 'Invalid code.' }, { status: 400 });
            }
        } else {
            if (!client) {
                return NextResponse.json({ error: 'Twilio not configured.' }, { status: 500 });
            }
            const check = await client.verify.v2
                .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
                .verificationChecks.create({ to: phone_number, code });
            if (check.status !== 'approved') {
                return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 400 });
            }
        }

        // Check if user exists
        const { rows: existing } = await pool.query(
            'SELECT id, phone_number, role, is_admin, is_banned FROM users WHERE phone_number = $1',
            [phone_number]
        );

        if (existing.length > 0) {
            const user = existing[0];
            if (user.is_banned) {
                return NextResponse.json({ error: 'Account suspended.' }, { status: 403 });
            }
            const token = signToken(user);
            return NextResponse.json({ token, user: { id: user.id, role: user.role, is_admin: user.is_admin, phone_number: user.phone_number } });
        }

        // New user — role is required
        if (!role || !['driver', 'passenger'].includes(role)) {
            return NextResponse.json({ error: 'New user: role ("driver" or "passenger") is required.', new_user: true }, { status: 400 });
        }

        const userId = uuidv4();
        const isAdmin = ADMIN_PHONES.includes(phone_number);
        const finalRole = isAdmin ? 'admin' : role;

        await pool.query(
            'INSERT INTO users (id, phone_number, phone_verified, role, is_admin) VALUES ($1, $2, TRUE, $3, $4)',
            [userId, phone_number, finalRole, isAdmin]
        );

        if (role === 'driver' || isAdmin) {
            const profileId = uuidv4();
            const name = display_name || phone_number;
            await pool.query(
                'INSERT INTO driver_profiles (id, user_id, display_name) VALUES ($1, $2, $3)',
                [profileId, userId, name]
            );
            await pool.query(
                'INSERT INTO driver_status (driver_id, status) VALUES ($1, $2)',
                [userId, 'offline']
            );
        }

        const newUser = { id: userId, role: finalRole, is_admin: isAdmin, phone_number };
        const token = signToken(newUser);

        return NextResponse.json({ token, user: newUser }, { status: 201 });
    } catch (err: any) {
        console.error('verify-otp error:', err.message);
        return NextResponse.json({ error: 'Verification failed.' }, { status: 500 });
    }
}
