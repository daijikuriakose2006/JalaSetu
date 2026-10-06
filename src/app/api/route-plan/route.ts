import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { geocodeAddress } from '@/lib/routing/geocode';
import { planMultiLegRoute } from '@/lib/routing/planner';
import { ratesArrayToMap } from '@/lib/routing/costs';
import type { Jetty, WaterEdge, Rate } from '@/lib/types/database';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { origin, destination, weight_tonnes, needs_loading_unloading, cargo_name } = body;

    const weight = Number(weight_tonnes) || 1;
    const needsLoading = Boolean(needs_loading_unloading);

    // If origin is string or missing coordinates, geocode it
    if (!origin || (!origin.lat && !origin.address)) {
      origin = { address: 'Kochi', lat: 9.9312, lng: 76.2673 };
    } else if (typeof origin === 'string') {
      const geo = await geocodeAddress(origin);
      origin = {
        address: geo?.displayName || origin,
        lat: geo?.lat || 9.9312,
        lng: geo?.lng || 76.2673,
      };
    } else if (!origin.lat || !origin.lng) {
      const geo = await geocodeAddress(origin.address);
      origin = {
        address: geo?.displayName || origin.address || 'Kochi',
        lat: geo?.lat || 9.9312,
        lng: geo?.lng || 76.2673,
      };
    }

    // If destination is string or missing coordinates, geocode it
    if (!destination || (!destination.lat && !destination.address)) {
      destination = { address: 'Alappuzha', lat: 9.4981, lng: 76.3388 };
    } else if (typeof destination === 'string') {
      const geo = await geocodeAddress(destination);
      destination = {
        address: geo?.displayName || destination,
        lat: geo?.lat || 9.4981,
        lng: geo?.lng || 76.3388,
      };
    } else if (!destination.lat || !destination.lng) {
      const geo = await geocodeAddress(destination.address);
      destination = {
        address: geo?.displayName || destination.address || 'Alappuzha',
        lat: geo?.lat || 9.4981,
        lng: geo?.lng || 76.3388,
      };
    }

    const admin = createAdminClient();

    // Fetch jetties, water edges, rates
    const [{ data: jettiesData }, { data: edgesData }, { data: ratesData }] = await Promise.all([
      admin.from('jetties').select('*').eq('is_active', true),
      admin.from('water_edges').select('*').eq('is_active', true),
      admin.from('rates').select('*'),
    ]);

    const jetties = (jettiesData as Jetty[]) || [];
    const edges = (edgesData as WaterEdge[]) || [];
    const rates = ratesArrayToMap(ratesData as Rate[]);

    const plan = await planMultiLegRoute(
      origin,
      destination,
      weight,
      needsLoading,
      jetties,
      edges,
      rates,
      cargo_name
    );

    if (!plan) {
      return NextResponse.json(
        { error: 'Unable to calculate a waterway route between these locations in Kerala.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      plan,
      origin,
      destination,
    });
  } catch (err: any) {
    console.error('Route plan error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
