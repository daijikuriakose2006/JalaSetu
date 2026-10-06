import { NextResponse } from 'next/server';
import { createUntypedAdminClient } from '@/lib/supabase/admin-untyped';
import { verifyOtpSchema } from '@/lib/validations';
import { createHash, randomBytes } from 'crypto';

function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

interface OtpRecord {
  id: string;
  email: string;
  otp_hash: string;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  used: boolean;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, otp } = parsed.data;
    const db = createUntypedAdminClient();

    // Find the latest unused OTP
    const { data: otpRecords } = await db
      .from('password_reset_otps')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!otpRecords || otpRecords.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired code. Please request a new one.' },
        { status: 400 }
      );
    }

    const otpRecord = otpRecords[0] as OtpRecord;

    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check attempts
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      await db
        .from('password_reset_otps')
        .update({ used: true })
        .eq('id', otpRecord.id);
      return NextResponse.json(
        { error: 'Too many attempts. Please request a new code.' },
        { status: 400 }
      );
    }

    // Increment attempts
    await db
      .from('password_reset_otps')
      .update({ attempts: otpRecord.attempts + 1 })
      .eq('id', otpRecord.id);

    // Verify OTP hash
    const otpHash = hashOtp(otp);
    if (otpHash !== otpRecord.otp_hash) {
      const remaining = otpRecord.max_attempts - otpRecord.attempts - 1;
      return NextResponse.json(
        { error: `Invalid code. ${remaining} attempt(s) remaining.` },
        { status: 400 }
      );
    }

    // OTP valid! Mark as used
    await db
      .from('password_reset_otps')
      .update({ used: true })
      .eq('id', otpRecord.id);

    // Generate short-lived reset token (15 min)
    const resetToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(resetToken).digest('hex');

    await db.from('password_reset_otps').insert({
      email: email.toLowerCase(),
      otp_hash: `reset:${tokenHash}`,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      max_attempts: 1,
      used: false,
    });

    return NextResponse.json({ message: 'Code verified successfully', resetToken });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
