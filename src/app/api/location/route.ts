import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
    const { lat, lng, job_id, heading, speed } = body;

    if (lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Check if location row already exists for this user
    const { data: existing } = await admin
      .from('live_locations')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      await admin
        .from('live_locations')
        .update({
          geog: `POINT(${lng} ${lat})` as any,
          job_id: job_id || null,
          heading: heading ? Number(heading) : null,
          speed: speed ? Number(speed) : null,
          updated_at: now,
        } as any)
        .eq('id', existing.id);
    } else {
      await admin.from('live_locations').insert({
        user_id: user.id,
        geog: `POINT(${lng} ${lat})` as any,
        job_id: job_id || null,
        heading: heading ? Number(heading) : null,
        speed: speed ? Number(speed) : null,
        updated_at: now,
      } as any);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');
    const userId = searchParams.get('user_id');

    let query = admin.from('live_locations').select('*');

    if (jobId) {
      query = query.eq('job_id', jobId);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Parse lat/lng from PostGIS geog
    const locations = (data || []).map((loc: any) => {
      let lat = null;
      let lng = null;
      if (loc.geog?.coordinates) {
        lng = loc.geog.coordinates[0];
        lat = loc.geog.coordinates[1];
      }
      return {
        ...loc,
        lat,
        lng,
      };
    });

    return NextResponse.json({ locations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
