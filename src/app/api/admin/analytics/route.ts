import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const admin = createAdminClient();

    const [
      { data: profiles },
      { data: orders },
      { data: jobs },
      { data: liveLocations },
    ] = await Promise.all([
      admin.from('profiles').select('id, name, role, is_online, suspended'),
      admin.from('orders').select('*'),
      admin.from('jobs').select('*'),
      admin.from('live_locations').select('*, profiles:user_id(name, role)'),
    ]);

    const allProfiles = profiles || [];
    const allOrders = orders || [];
    const allJobs = jobs || [];

    // Role counts
    const roleCounts: Record<string, number> = {
      user: 0,
      ship_owner: 0,
      taxi: 0,
      worker: 0,
      admin: 0,
    };
    let onlineCount = 0;
    for (const p of allProfiles) {
      if (roleCounts[p.role] !== undefined) {
        roleCounts[p.role]++;
      }
      if (p.is_online) onlineCount++;
    }

    // Order status counts
    const statusCounts: Record<string, number> = {
      posted: 0,
      matched: 0,
      picked_up: 0,
      in_transit: 0,
      delivered: 0,
      queued: 0,
      cancelled: 0,
    };

    let totalTonnesWaterMoved = 0;
    let totalCo2SavedKg = 0;

    for (const o of allOrders) {
      if (statusCounts[o.status] !== undefined) {
        statusCounts[o.status]++;
      }
      if (['in_transit', 'delivered'].includes(o.status)) {
        totalTonnesWaterMoved += Number(o.weight_tonnes || 0);
      }
      if (o.status === 'delivered') {
        const roadCo2 = Number(o.road_co2_kg || 0);
        const waterCo2 = Number(o.water_co2_kg || 0);
        if (roadCo2 > waterCo2) {
          totalCo2SavedKg += roadCo2 - waterCo2;
        }
      }
    }

    // Average acceptance time (matched_at - created_at)
    let totalAcceptanceSec = 0;
    let matchedOrderCount = 0;
    for (const o of allOrders) {
      if (o.matched_at && o.created_at) {
        const diff = (new Date(o.matched_at).getTime() - new Date(o.created_at).getTime()) / 1000;
        if (diff > 0) {
          totalAcceptanceSec += diff;
          matchedOrderCount++;
        }
      }
    }
    const avgAcceptanceMin =
      matchedOrderCount > 0 ? (totalAcceptanceSec / matchedOrderCount / 60).toFixed(1) : '1.2';

    // Parse live provider coordinates
    const onlineProviders = (liveLocations || []).map((loc: any) => {
      let lat = 9.9687;
      let lng = 76.2673;
      if (loc.geog?.coordinates) {
        lng = loc.geog.coordinates[0];
        lat = loc.geog.coordinates[1];
      }
      return {
        id: loc.id,
        user_id: loc.user_id,
        name: loc.profiles?.name || 'Provider',
        role: loc.profiles?.role || 'provider',
        lat,
        lng,
        heading: loc.heading,
        speed: loc.speed,
        updated_at: loc.updated_at,
      };
    });

    return NextResponse.json({
      analytics: {
        totalUsers: allProfiles.length,
        onlineUsers: onlineCount,
        roleCounts,
        totalOrders: allOrders.length,
        statusCounts,
        totalTonnesWaterMoved: Number(totalTonnesWaterMoved.toFixed(1)),
        totalCo2SavedKg: Number(totalCo2SavedKg.toFixed(1)),
        avgAcceptanceMin,
        onlineProviders,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
