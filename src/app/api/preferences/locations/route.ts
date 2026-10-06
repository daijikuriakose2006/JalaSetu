import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/preferences/locations — List current user's preferred operating locations
export async function GET() {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: locations, error } = await admin
      .from('preferred_locations')
      .select('id, user_id, name, radius_km, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ locations: locations || [] });
  } catch (error: any) {
    console.error('Get preferred locations error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/preferences/locations — Add a new preferred operating location
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, lat = 9.9687, lng = 76.2673, radius_km = 15 } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Location name is required' }, { status: 400 });
    }

    const { data: created, error } = await admin
      .from('preferred_locations')
      .insert({
        user_id: user.id,
        name: name.trim(),
        geog: `POINT(${Number(lng)} ${Number(lat)})` as any,
        radius_km: Number(radius_km) || 15,
      } as any)
      .select('id, user_id, name, radius_km, created_at')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, location: created }, { status: 201 });
  } catch (error: any) {
    console.error('Add preferred location error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
