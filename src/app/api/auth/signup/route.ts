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

    const { name, email, password, role, vehicle_type, capacity_t, ship_type, capacity_kg } = parsed.data;

    // Never allow admin signup via API
    if ((role as string) === 'admin') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Capacity calculation
    const shipCapacityT = capacity_kg ? Number((capacity_kg / 1000).toFixed(2)) : null;
    const finalCapacityT = role === 'taxi' ? capacity_t : role === 'ship_owner' ? shipCapacityT : null;

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for hackathon
      user_metadata: {
        name,
        role,
        vehicle_type: role === 'taxi' ? vehicle_type : null,
        capacity_t: finalCapacityT,
        ship_type: role === 'ship_owner' ? ship_type : null,
        capacity_kg: role === 'ship_owner' ? capacity_kg : null,
      },
    });

    if (authError) {
      if (authError.message.includes('already')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please log in.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: authError.message || 'Unable to create account.' }, { status: 400 });
    }

    const userId = authData.user.id;

    // Ensure profile row exists and update capacity
    await supabase.from('profiles').upsert({
      id: userId,
      name,
      email,
      role,
      vehicle_type: role === 'taxi' ? (vehicle_type as any) : null,
      capacity_t: finalCapacityT,
      is_online: true,
      suspended: false,
    });

    // If Ship Owner, automatically seed their registered boat into the boats table
    if (role === 'ship_owner' && shipCapacityT) {
      // Find nearest or default home jetty (e.g. Ernakulam Boat Jetty)
      const { data: defaultJetty } = await supabase
        .from('jetties')
        .select('id')
        .eq('name', 'Ernakulam Boat Jetty')
        .single();

      const boatName = `${name}'s ${ship_type ? ship_type.replace(/_/g, ' ').toUpperCase() : 'Barge'}`;

      await supabase.from('boats').insert({
        owner_id: userId,
        name: boatName,
        capacity_t: shipCapacityT,
        cargo_types: ['building_material', 'sand', 'cement', 'general', 'timber'],
        home_jetty_id: defaultJetty?.id || null,
        is_active: true,
        registration_number: `KL-${Math.floor(1000 + Math.random() * 9000)}`,
      });
    }

    return NextResponse.json(
      {
        message: 'Account created successfully',
        user: { id: userId, email: authData.user.email, role },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
