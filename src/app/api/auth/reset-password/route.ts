import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createUntypedAdminClient } from '@/lib/supabase/admin-untyped';
import { resetPasswordSchema } from '@/lib/validations';
import { createHash } from 'crypto';

interface TokenRecord {
  id: string;
  email: string;
  expires_at: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const supabase = createAdminClient();
    const db = createUntypedAdminClient();

    // Find the reset token
    const { data: tokenRecords } = await db
      .from('password_reset_otps')
      .select('*')
      .eq('otp_hash', `reset:${tokenHash}`)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!tokenRecords || tokenRecords.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link. Please request a new one.' },
        { status: 400 }
      );
    }

    const tokenRecord = tokenRecords[0] as TokenRecord;

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Reset link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Mark token as used
    await db
      .from('password_reset_otps')
      .update({ used: true })
      .eq('id', tokenRecord.id);

    // Find user by email
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find(
      (u) => u.email?.toLowerCase() === tokenRecord.email.toLowerCase()
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Unable to reset password. Please try again.' },
        { status: 400 }
      );
    }

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json(
        { error: 'Unable to reset password. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Password reset successfully. You can now sign in.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
