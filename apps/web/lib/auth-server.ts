import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import pool from './db';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'dev-secret';

export interface AuthUser {
    id: string;
    role: string;
    is_admin: boolean;
    phone_number: string;
}

export function signToken(user: AuthUser): string {
    const payload = { id: user.id, role: user.role, is_admin: user.is_admin };
    const options: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any };
    return jwt.sign(payload, JWT_SECRET, options);
}

export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const { rows } = await pool.query(
            'SELECT id, phone_number, role, is_admin, is_banned FROM users WHERE id = $1',
            [decoded.id]
        );
        if (!rows[0] || rows[0].is_banned) return null;
        return rows[0] as AuthUser;
    } catch {
        return null;
    }
}

export function unauthorized() {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbidden() {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
