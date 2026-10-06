import { createAdminClient } from '@/lib/supabase/admin';
import type { Order, OrderLeg, Job, Profile, Boat, Jetty, WaterEdge, PreferredLocation } from '@/lib/types/database';
import { scoreBoats, scoreTaxis, scoreWorkers } from './score';

export interface DispatchParams {
  order: Order;
  legs: OrderLeg[];
  jetties: Jetty[];
  edges: WaterEdge[];
}

/**
 * Dispatch an order: creates jobs for ship, taxi(s), and workers (if required).
 * Handles immediate vs future orders, notify_at calculation, and notification creation.
 */
export async function dispatchOrder(params: DispatchParams): Promise<{ jobsCreated: number }> {
  const { order, legs, jetties, edges } = params;
  const admin = createAdminClient();

  // Load all profiles, boats, preferred locations for matching
  const [{ data: profiles }, { data: boats }, { data: prefs }] = await Promise.all([
    admin.from('profiles').select('*'),
    admin.from('boats').select('*'),
    admin.from('preferred_locations').select('*'),
  ]);

  const allProfiles = (profiles as Profile[]) || [];
  const allBoats = (boats as Boat[]) || [];
  const allPrefs = (prefs as PreferredLocation[]) || [];

  // Attach owner to boats
  const boatsWithOwners = allBoats.map((b) => ({
    ...b,
    owner: allProfiles.find((p) => p.id === b.owner_id),
  }));

  const originJetty = jetties.find((j) => j.id === order.origin_jetty_id);
  const destJetty = jetties.find((j) => j.id === order.destination_jetty_id);

  let jobsCreatedCount = 0;
  const now = new Date();
  const pickupTime = new Date(order.pickup_time || now.toISOString());
  const isImmediate = order.is_immediate || (pickupTime.getTime() - now.getTime() < 30 * 60 * 1000);

  // 1. SHIP JOB DISPATCH
  const waterLeg = legs.find((l) => l.leg_type === 'water');
  if (waterLeg && originJetty && destJetty) {
    const scoredBoats = scoreBoats(
      boatsWithOwners,
      originJetty,
      destJetty,
      Number(order.weight_tonnes),
      order.cargo_name,
      edges,
      jetties,
      isImmediate,
      allPrefs
    );

    // Top 3 boats
    const topBoats = scoredBoats.slice(0, 3);
    const offeredOwnerIds = topBoats.map((sb) => sb.boat.owner_id).filter(Boolean);

    // If no specific boat matches directly, we offer to all active ship owners
    const finalOffered = offeredOwnerIds.length > 0 
      ? offeredOwnerIds 
      : allProfiles.filter(p => p.role === 'ship_owner' && !p.suspended).map(p => p.id);

    // 1-minute expiration for initial offer before radius expansion
    const expiresAt = new Date(now.getTime() + 60 * 1000);

    const shipJobData: Partial<Job> = {
      order_id: order.id,
      leg_id: waterLeg.id,
      type: 'ship',
      status: 'open',
      offered_to: finalOffered,
      radius_km: 15,
      expires_at: expiresAt.toISOString(),
      notify_at: now.toISOString(), // immediate notification
      jetty_id: originJetty.id,
      estimated_payout: waterLeg.cost ? Number(waterLeg.cost) : Math.round(Number(order.weight_tonnes) * 200),
      status_history: [
        {
          status: 'open',
          at: now.toISOString(),
          by: 'system_dispatch',
        },
      ],
    };

    const { data: createdShipJob, error: shipJobErr } = await admin
      .from('jobs')
      .insert(shipJobData as any)
      .select()
      .single();

    if (!shipJobErr && createdShipJob) {
      jobsCreatedCount++;
      // Create provider notification for each offered boat owner
      for (const ownerId of finalOffered) {
        await createProviderNotification(admin, {
          userId: ownerId,
          title: 'New Water Freight Job Available! 🚢',
          body: `${order.cargo_name} (${order.weight_tonnes}t): ${originJetty.name} → ${destJetty.name}. Est payout: ₹${shipJobData.estimated_payout}`,
          data: {
            jobId: createdShipJob.id,
            orderId: order.id,
            type: 'ship',
            from: originJetty.name,
            destination: destJetty.name,
            date: pickupTime.toISOString(),
            item: order.cargo_name,
            quantity: `${order.weight_tonnes} tonnes`,
            estimatedPayout: shipJobData.estimated_payout,
          },
        });
      }
    }
  }

  // 2. ORIGIN TAXI JOB
  const roadOriginLeg = legs.find((l) => l.leg_type === 'road_origin');
  if (roadOriginLeg) {
    const taxis = allProfiles.filter((p) => p.role === 'taxi' && !p.suspended);
    const scored = scoreTaxis(taxis, 9.9687, 76.2673, Number(order.weight_tonnes));
    const topTaxis = scored.slice(0, 5).map((st) => st.taxi.id);
    const finalTaxiOffered = topTaxis.length > 0 ? topTaxis : taxis.map((t) => t.id);

    // If order is immediate, dispatch in parallel with ship offers
    // If order is future, notify_at = pickup_time - 30 minutes
    const taxiNotifyAt = isImmediate
      ? now.toISOString()
      : new Date(pickupTime.getTime() - 30 * 60 * 1000).toISOString();

    const taxiPayout = roadOriginLeg.cost ? Number(roadOriginLeg.cost) : 450;

    const taxiJobData: Partial<Job> = {
      order_id: order.id,
      leg_id: roadOriginLeg.id,
      type: 'taxi',
      status: 'open',
      offered_to: finalTaxiOffered,
      radius_km: 5,
      expires_at: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
      notify_at: taxiNotifyAt,
      estimated_payout: taxiPayout,
      status_history: [
        {
          status: 'open',
          at: now.toISOString(),
          by: 'system_dispatch',
        },
      ],
    };

    const { data: createdTaxiJob, error: taxiErr } = await admin
      .from('jobs')
      .insert(taxiJobData as any)
      .select()
      .single();

    if (!taxiErr && createdTaxiJob) {
      jobsCreatedCount++;
      if (isImmediate) {
        for (const taxiId of finalTaxiOffered) {
          await createProviderNotification(admin, {
            userId: taxiId,
            title: 'New Cargo Pickup Request! 🚛',
            body: `Pickup ${order.cargo_name} (${order.weight_tonnes}t) to ${originJetty?.name || 'Jetty'}. Est payout: ₹${taxiPayout}`,
            data: {
              jobId: createdTaxiJob.id,
              orderId: order.id,
              type: 'taxi',
              from: order.origin_address,
              destination: originJetty?.name || 'Origin Jetty',
              date: pickupTime.toISOString(),
              item: order.cargo_name,
              quantity: `${order.weight_tonnes} tonnes`,
              estimatedPayout: taxiPayout,
            },
          });
        }
      }
    }
  }

  // 3. DESTINATION TAXI JOB (if destination road leg exists)
  const roadDestLeg = legs.find((l) => l.leg_type === 'road_destination');
  if (roadDestLeg && destJetty) {
    const taxis = allProfiles.filter((p) => p.role === 'taxi' && !p.suspended);
    const destTaxiPayout = roadDestLeg.cost ? Number(roadDestLeg.cost) : 450;

    // Destination taxi notify_at is scheduled when boat arrives (ETA - 30m)
    // Water duration estimate in mins
    const waterDurMin = waterLeg?.duration_min ? Number(waterLeg.duration_min) : 180;
    const boatArrivalEst = new Date(pickupTime.getTime() + waterDurMin * 60 * 1000);
    const destTaxiNotifyAt = new Date(boatArrivalEst.getTime() - 30 * 60 * 1000);

    const destTaxiJobData: Partial<Job> = {
      order_id: order.id,
      leg_id: roadDestLeg.id,
      type: 'taxi',
      status: 'open',
      offered_to: taxis.map((t) => t.id),
      radius_km: 8,
      notify_at: destTaxiNotifyAt.toISOString(),
      estimated_payout: destTaxiPayout,
      status_history: [
        {
          status: 'open',
          at: now.toISOString(),
          by: 'system_dispatch',
        },
      ],
    };

    const { error: destTaxiErr } = await admin.from('jobs').insert(destTaxiJobData as any);
    if (!destTaxiErr) jobsCreatedCount++;
  }

  // 4. LOADING & UNLOADING WORKERS (if needs_loading_unloading is true)
  if (order.needs_loading_unloading) {
    const workers = allProfiles.filter((p) => p.role === 'worker' && !p.suspended);
    const workerIds = workers.map((w) => w.id);
    const workerPayout = Math.max(300, Math.round(Number(order.weight_tonnes) * 120));

    // Loading job at origin jetty: notify_at = max(now, pickup_time - 5h)
    const fiveHoursBefore = new Date(pickupTime.getTime() - 5 * 60 * 60 * 1000);
    const loadingNotifyAt = fiveHoursBefore.getTime() < now.getTime() ? now : fiveHoursBefore;

    const loadJobData: Partial<Job> = {
      order_id: order.id,
      type: 'load',
      status: 'open',
      offered_to: workerIds,
      jetty_id: originJetty?.id,
      notify_at: loadingNotifyAt.toISOString(),
      estimated_payout: workerPayout,
      status_history: [{ status: 'open', at: now.toISOString(), by: 'system_dispatch' }],
    };

    const { data: loadJob, error: loadErr } = await admin.from('jobs').insert(loadJobData as any).select().single();
    if (!loadErr && loadJob) {
      jobsCreatedCount++;
      if (loadingNotifyAt.getTime() <= now.getTime()) {
        for (const wId of workerIds) {
          await createProviderNotification(admin, {
            userId: wId,
            title: 'Loading Crew Needed at Jetty! 💪',
            body: `Load ${order.weight_tonnes}t of ${order.cargo_name} at ${originJetty?.name || 'Jetty'}. Payout: ₹${workerPayout}`,
            data: {
              jobId: loadJob.id,
              orderId: order.id,
              type: 'load',
              from: originJetty?.name || 'Origin Jetty',
              destination: destJetty?.name || 'Destination Jetty',
              date: pickupTime.toISOString(),
              item: order.cargo_name,
              quantity: `${order.weight_tonnes} tonnes`,
              estimatedPayout: workerPayout,
            },
          });
        }
      }
    }

    // Unloading job at destination jetty
    const waterDurMin = waterLeg?.duration_min ? Number(waterLeg.duration_min) : 180;
    const destArrival = new Date(pickupTime.getTime() + waterDurMin * 60 * 1000);
    const unloadFiveHoursBefore = new Date(destArrival.getTime() - 5 * 60 * 60 * 1000);
    const unloadNotifyAt = unloadFiveHoursBefore.getTime() < now.getTime() ? now : unloadFiveHoursBefore;

    const unloadJobData: Partial<Job> = {
      order_id: order.id,
      type: 'unload',
      status: 'open',
      offered_to: workerIds,
      jetty_id: destJetty?.id,
      notify_at: unloadNotifyAt.toISOString(),
      estimated_payout: workerPayout,
      status_history: [{ status: 'open', at: now.toISOString(), by: 'system_dispatch' }],
    };

    const { error: unloadErr } = await admin.from('jobs').insert(unloadJobData as any);
    if (!unloadErr) jobsCreatedCount++;
  }

  return { jobsCreated: jobsCreatedCount };
}

/**
 * Helper to write a notification row
 */
export async function createProviderNotification(
  admin: any,
  params: {
    userId: string;
    title: string;
    body: string;
    data: Record<string, unknown>;
  }
) {
  try {
    await admin.from('notifications').insert({
      user_id: params.userId,
      title: params.title,
      body: params.body,
      data: params.data,
      read: false,
    });
  } catch (err) {
    console.warn('Failed to insert notification:', err);
  }
}
