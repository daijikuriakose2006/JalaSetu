import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { signupSchema } from '@/lib/validations';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password, role, vehicle_type, capacity_t } = parsed.data;

    // Never allow admin signup via API
    if (role === 'admin') {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for hackathon
      user_metadata: {
        name,
        role,
        vehicle_type: role === 'taxi' ? vehicle_type : null,
        capacity_t: role === 'taxi' ? capacity_t : null,
      },
    });

    if (authError) {
      // Don't reveal if email exists
      if (authError.message.includes('already')) {
        return NextResponse.json(
          { error: 'Unable to create account. Please try again or use a different email.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Unable to create account. Please try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Account created successfully', user: { id: authData.user.id, email: authData.user.email } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
