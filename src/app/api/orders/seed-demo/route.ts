import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dispatchOrder } from '@/lib/matching/dispatch';
import type { Order, OrderLeg, Jetty, WaterEdge } from '@/lib/types/database';

export async function POST() {
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

    // Fetch jetties
    const { data: jettiesData } = await admin.from('jetties').select('*');
    const jetties = (jettiesData as Jetty[]) || [];

    const ernakulam = jetties.find(
      (j) => j.name.toLowerCase().includes('ernakulam') || j.name.toLowerCase().includes('kochi')
    ) || jetties[0];

    const alappuzha = jetties.find(
      (j) => j.name.toLowerCase().includes('alappuzha') || j.name.toLowerCase().includes('alleppey')
    ) || (jetties.length > 1 ? jetties[1] : jetties[0]);

    const { data: edgesData } = await admin.from('water_edges').select('*');
    const edges = (edgesData as WaterEdge[]) || [];

    const originLat = 9.9687;
    const originLng = 76.2673;
    const destLat = 9.4981;
    const destLng = 76.3388;

    // Create Demo Order
    const { data: order, error: orderErr } = await admin
      .from('orders')
      .insert({
        user_id: user.id,
        status: 'posted',
        cargo_name: 'Building Material (Cement & AAC Blocks)',
        cargo_description: '8 tonnes of palletized construction material for canal restoration site.',
        weight_tonnes: 8,
        needs_loading_unloading: true,
        pickup_time: new Date().toISOString(),
        is_immediate: true,
        origin_address: 'Kochi Marine Drive Construction Yard',
        origin_geog: `POINT(${originLng} ${originLat})` as any,
        origin_jetty_id: ernakulam?.id || null,
        destination_address: 'Alappuzha Finishing Site',
        destination_geog: `POINT(${destLng} ${destLat})` as any,
        destination_jetty_id: alappuzha?.id || null,
        road_distance_km: 65,
        road_duration_min: 150,
        road_cost: 6500,
        road_co2_kg: 54.6,
        water_distance_km: 72,
        water_duration_min: 360,
        water_cost: 3860,
        water_co2_kg: 17.8,
        comparison_explanation:
          'Inland waterway transport delivers 41% cost savings and 67% reduction in CO2 emissions compared to NH66 road transit for this 8-tonne building material consignment.',
        recommended_origin_vehicle: 'truck',
        recommended_dest_vehicle: 'truck',
        recommended_boat_type: 'barge',
        chat_history: [
          { role: 'user', content: 'Move 8 tonnes of building materials from Kochi to Alappuzha today.' },
          { role: 'assistant', content: 'Planned multi-modal inland waterway route via Vembanad Lake backwaters with origin and destination truck legs.' },
        ],
      } as any)
      .select()
      .single();

    if (orderErr || !order) {
      throw orderErr || new Error('Failed to create demo order');
    }

    // Insert 3 Order Legs
    const legsToInsert = [
      {
        order_id: order.id,
        leg_type: 'road_origin',
        sequence_num: 1,
        from_address: 'Kochi Marine Drive Construction Yard',
        from_geog: `POINT(${originLng} ${originLat})` as any,
        to_address: ernakulam?.name || 'Ernakulam Boat Jetty',
        to_jetty_id: ernakulam?.id || null,
        distance_km: 4.5,
        duration_min: 15,
        cost: 450,
        co2_kg: 3.8,
      },
      {
        order_id: order.id,
        leg_type: 'water',
        sequence_num: 2,
        from_address: ernakulam?.name || 'Ernakulam Boat Jetty',
        from_jetty_id: ernakulam?.id || null,
        to_address: alappuzha?.name || 'Alappuzha Boat Jetty',
        to_jetty_id: alappuzha?.id || null,
        distance_km: 64,
        duration_min: 330,
        cost: 1600,
        co2_kg: 10.2,
      },
      {
        order_id: order.id,
        leg_type: 'road_destination',
        sequence_num: 3,
        from_address: alappuzha?.name || 'Alappuzha Boat Jetty',
        from_jetty_id: alappuzha?.id || null,
        to_address: 'Alappuzha Finishing Site',
        to_geog: `POINT(${destLng} ${destLat})` as any,
        distance_km: 3.5,
        duration_min: 15,
        cost: 450,
        co2_kg: 3.8,
      },
    ];

    const { data: createdLegs, error: legsErr } = await admin
      .from('order_legs')
      .insert(legsToInsert as any)
      .select();

    if (legsErr) throw legsErr;

    // Trigger dispatch to generate ship, taxi, load, unload jobs
    const dispatchResult = await dispatchOrder({
      order: order as Order,
      legs: (createdLegs as OrderLeg[]) || [],
      jetties,
      edges,
    });

    return NextResponse.json({
      success: true,
      message: 'Demo order and multi-modal jobs created successfully!',
      orderId: order.id,
      jobsCreated: dispatchResult.jobsCreated,
    });
  } catch (error: any) {
    console.error('Seed demo order error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
