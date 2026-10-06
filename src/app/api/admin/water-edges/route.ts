import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: edges, error } = await admin
      .from('water_edges')
      .select('*, from_jetty:from_jetty_id(name), to_jetty:to_jetty_id(name)')
      .order('created_at');

    if (error) throw error;
    return NextResponse.json({ edges: edges || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { from_jetty_id, to_jetty_id, distance_km, avg_speed_kmph, waterway_name } = body;
    const admin = createAdminClient();

    // Insert bidirectional edges
    const { data, error } = await admin.from('water_edges').insert([
      {
        from_jetty_id,
        to_jetty_id,
        distance_km: Number(distance_km),
        avg_speed_kmph: Number(avg_speed_kmph) || 10,
        waterway_name: waterway_name || 'Kerala Waterway',
        is_active: true,
      },
      {
        from_jetty_id: to_jetty_id,
        to_jetty_id: from_jetty_id,
        distance_km: Number(distance_km),
        avg_speed_kmph: Number(avg_speed_kmph) || 10,
        waterway_name: waterway_name || 'Kerala Waterway',
        is_active: true,
      },
    ]).select();

    if (error) throw error;
    return NextResponse.json({ edges: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const admin = createAdminClient();
    await admin.from('water_edges').delete().eq('id', id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
