import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Jetty } from '@/lib/types/database';

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('jetties')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    // Standardize lat and lng from PostGIS geometry coordinates if needed
    const jetties = (data as Jetty[] || []).map((j: any) => {
      let lat = j.lat;
      let lng = j.lng;

      if ((lat === undefined || lng === undefined) && j.geog) {
        // PostGIS geometry object or GeoJSON
        if (j.geog.coordinates) {
          lng = j.geog.coordinates[0];
          lat = j.geog.coordinates[1];
        }
      }

      return {
        ...j,
        lat,
        lng,
      };
    });

    return NextResponse.json({ jetties });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
