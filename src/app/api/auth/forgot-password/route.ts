import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { forgotPasswordSchema } from '@/lib/validations';
import { createHash, randomInt } from 'crypto';
import nodemailer from 'nodemailer';

// Rate limiting: max 3 requests per email per 15 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 3;

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const key = email.toLowerCase();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

async function sendOtpEmail(email: string, otp: string) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"JalaSetu" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Password Reset OTP - JalaSetu',
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #3F7F83; margin-bottom: 16px;">Password Reset</h2>
        <p style="color: #4B5560;">Your one-time password for JalaSetu:</p>
        <div style="background: #F8F3EA; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #3F7F83;">${otp}</span>
        </div>
        <p style="color: #6B7580; font-size: 14px;">This code expires in 10 minutes. Do not share it with anyone.</p>
        <p style="color: #6B7580; font-size: 12px; margin-top: 24px;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Rate limit check
    if (!checkRateLimit(email)) {
      // Always return success to not reveal if email exists
      return NextResponse.json(
        { message: 'If an account with that email exists, we have sent a reset code.' },
        { status: 200 }
      );
    }

    // Always return the same response regardless of whether email exists
    // This prevents email enumeration
    const genericResponse = NextResponse.json(
      { message: 'If an account with that email exists, we have sent a reset code.' },
      { status: 200 }
    );

    const supabase = createAdminClient();

    // Check if user exists (server-side only, never exposed)
    const { data: users } = await supabase.auth.admin.listUsers();
    const userExists = users?.users?.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!userExists) {
      // Return same response to prevent enumeration
      return genericResponse;
    }

    // Generate 6-digit OTP
    const otp = randomInt(100000, 999999).toString();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate any existing OTPs for this email
    await supabase
      .from('password_reset_otps')
      .update({ used: true } as Record<string, unknown>)
      .eq('email', email.toLowerCase())
      .eq('used', false);

    // Store hashed OTP
    await supabase.from('password_reset_otps').insert({
      email: email.toLowerCase(),
      otp_hash: otpHash,
      expires_at: expiresAt.toISOString(),
    } as Record<string, unknown>);

    // Send email (don't await to not delay response)
    sendOtpEmail(email, otp).catch((err) =>
      console.error('Failed to send OTP email:', err)
    );

    return genericResponse;
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { message: 'If an account with that email exists, we have sent a reset code.' },
      { status: 200 }
    );
  }
}
