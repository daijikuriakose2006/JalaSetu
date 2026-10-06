import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: jetties, error } = await admin.from('jetties').select('*').order('name');
    if (error) throw error;

    const formatted = (jetties || []).map((j: any) => {
      let lat = j.lat;
      let lng = j.lng;
      if (j.geog?.coordinates) {
        lng = j.geog.coordinates[0];
        lat = j.geog.coordinates[1];
      }
      return { ...j, lat, lng };
    });

    return NextResponse.json({ jetties: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, district, lat, lng, has_loading_facility, is_active } = body;
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('jetties')
      .insert({
        name,
        district: district || null,
        geog: `POINT(${lng} ${lat})` as any,
        has_loading_facility: Boolean(has_loading_facility),
        is_active: is_active !== undefined ? Boolean(is_active) : true,
        is_approximate: true,
      } as any)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ jetty: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, district, lat, lng, has_loading_facility, is_active } = body;
    const admin = createAdminClient();

    const updates: any = {};
    if (name) updates.name = name;
    if (district !== undefined) updates.district = district;
    if (lat !== undefined && lng !== undefined) updates.geog = `POINT(${lng} ${lat})`;
    if (has_loading_facility !== undefined) updates.has_loading_facility = Boolean(has_loading_facility);
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    const { data, error } = await admin.from('jetties').update(updates).eq('id', id).select().single();
    if (error) throw error;

    return NextResponse.json({ jetty: data });
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
    await admin.from('jetties').delete().eq('id', id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
