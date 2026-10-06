import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dispatchOrder } from '@/lib/matching/dispatch';
import type { Order, OrderLeg, Jetty, WaterEdge } from '@/lib/types/database';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (status && status !== 'all') {
      query = query.eq('status', status as any);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ orders: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
    const {
      cargo_name,
      cargo_description,
      weight_tonnes,
      needs_loading_unloading,
      pickup_time,
      is_immediate,
      origin_address,
      origin_coords, // [lat, lng]
      origin_jetty_id,
      destination_address,
      dest_coords, // [lat, lng]
      destination_jetty_id,
      road_comparison,
      water_totals,
      comparison_explanation,
      recommended_origin_vehicle,
      recommended_dest_vehicle,
      recommended_boat_type,
      legs,
      chat_history = [],
    } = body;

    const originLat = origin_coords?.[0] || 9.9312;
    const originLng = origin_coords?.[1] || 76.2673;
    const destLat = dest_coords?.[0] || 9.4981;
    const destLng = dest_coords?.[1] || 76.3388;

    // Use admin client to insert order with geography points
    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        user_id: user.id,
        status: 'posted',
        cargo_name: cargo_name || 'General Cargo',
        cargo_description: cargo_description || null,
        weight_tonnes: Number(weight_tonnes) || 1,
        needs_loading_unloading: Boolean(needs_loading_unloading),
        pickup_time: pickup_time || new Date().toISOString(),
        is_immediate: is_immediate !== undefined ? Boolean(is_immediate) : true,
        origin_address: origin_address || 'Kochi, Kerala',
        origin_geog: `POINT(${originLng} ${originLat})` as any,
        origin_jetty_id: origin_jetty_id || null,
        destination_address: destination_address || 'Alappuzha, Kerala',
        destination_geog: `POINT(${destLng} ${destLat})` as any,
        destination_jetty_id: destination_jetty_id || null,
        road_distance_km: road_comparison?.distance_km ?? null,
        road_duration_min: road_comparison?.duration_min ?? null,
        road_cost: road_comparison?.cost ?? null,
        road_co2_kg: road_comparison?.co2_kg ?? null,
        water_distance_km: water_totals?.distance_km ?? null,
        water_duration_min: water_totals?.duration_min ?? null,
        water_cost: water_totals?.cost ?? null,
        water_co2_kg: water_totals?.co2_kg ?? null,
        comparison_explanation: comparison_explanation || null,
        recommended_origin_vehicle: recommended_origin_vehicle || null,
        recommended_dest_vehicle: recommended_dest_vehicle || null,
        recommended_boat_type: recommended_boat_type || null,
        chat_history: chat_history,
      } as any)
      .select()
      .single();

    if (orderError) throw orderError;

    // Insert order legs
    const insertedLegs: OrderLeg[] = [];
    if (legs && Array.isArray(legs) && legs.length > 0) {
      for (const leg of legs) {
        const fromLat = leg.from_coords?.[0];
        const fromLng = leg.from_coords?.[1];
        const toLat = leg.to_coords?.[0];
        const toLng = leg.to_coords?.[1];

        const { data: createdLeg } = await admin
          .from('order_legs')
          .insert({
            order_id: order.id,
            leg_type: leg.leg_type,
            sequence_num: leg.sequence_num,
            from_address: leg.from_name,
            from_geog: fromLat && fromLng ? (`POINT(${fromLng} ${fromLat})` as any) : null,
            from_jetty_id: leg.from_jetty_id || null,
            to_address: leg.to_name,
            to_geog: toLat && toLng ? (`POINT(${toLng} ${toLat})` as any) : null,
            to_jetty_id: leg.to_jetty_id || null,
            distance_km: leg.distance_km,
            duration_min: leg.duration_min,
            cost: leg.cost,
            co2_kg: leg.co2_kg,
            route_geometry: leg.geometry || null,
          } as any)
          .select()
          .single();

        if (createdLeg) {
          insertedLegs.push(createdLeg as OrderLeg);
        }
      }
    }

    // Trigger matching and dispatch
    const [{ data: jetties }, { data: waterEdges }] = await Promise.all([
      admin.from('jetties').select('*'),
      admin.from('water_edges').select('*'),
    ]);

    await dispatchOrder({
      order: order as Order,
      legs: insertedLegs,
      jetties: (jetties as Jetty[]) || [],
      edges: (waterEdges as WaterEdge[]) || [],
    });

    return NextResponse.json({ order, legs: insertedLegs }, { status: 201 });
  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
