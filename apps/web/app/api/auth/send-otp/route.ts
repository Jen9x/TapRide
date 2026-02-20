import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const client = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

export async function POST(req: NextRequest) {
    try {
        const { phone_number } = await req.json();
        if (!phone_number || !/^\+[1-9]\d{7,14}$/.test(phone_number)) {
            return NextResponse.json({ error: 'Valid phone number required (+E.164).' }, { status: 400 });
        }

        // Dev bypass
        if (process.env.DEV_OTP_BYPASS) {
            return NextResponse.json({ message: 'OTP sent (dev bypass).' });
        }

        if (!client) {
            return NextResponse.json({ error: 'Twilio not configured.' }, { status: 500 });
        }

        await client.verify.v2
            .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
            .verifications.create({ to: phone_number, channel: 'sms' });

        return NextResponse.json({ message: 'OTP sent.' });
    } catch (err: any) {
        console.error('Twilio send-otp error:', err.message);
        return NextResponse.json({ error: 'Failed to send OTP. Please try again.' }, { status: 500 });
    }
}
