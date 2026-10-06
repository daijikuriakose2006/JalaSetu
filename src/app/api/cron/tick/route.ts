import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createProviderNotification } from '@/lib/matching/dispatch';
import type { Job, Order, Profile } from '@/lib/types/database';

export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const expectedToken = `Bearer ${process.env.CRON_SECRET || 'dev-cron-secret'}`;

    if (!authHeader || authHeader !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const now = new Date();

    let notificationsSent = 0;
    let timeoutsProcessed = 0;
    let radiusExpansions = 0;
    let ordersQueued = 0;

    // 1. Process due notify_at values for open jobs
    const { data: dueJobs } = await admin
      .from('jobs')
      .select('*, orders(*)')
      .eq('status', 'open')
      .lte('notify_at', now.toISOString());

    if (dueJobs && dueJobs.length > 0) {
      for (const job of dueJobs as (Job & { orders: Order })[]) {
        if (job.offered_to && job.offered_to.length > 0) {
          const order = job.orders;
          for (const userId of job.offered_to) {
            await createProviderNotification(admin, {
              userId,
              title: `Scheduled Job Now Available: ${job.type.toUpperCase()}`,
              body: `Cargo: ${order?.cargo_name || 'Goods'}. Payout: ₹${job.estimated_payout || 0}`,
              data: {
                jobId: job.id,
                orderId: job.order_id,
                type: job.type,
                item: order?.cargo_name,
                estimatedPayout: job.estimated_payout,
              },
            });
            notificationsSent++;
          }
        }
      }
    }

    // 2. Process expired 1-minute boat offers & radius expansion
    const { data: expiredShipJobs } = await admin
      .from('jobs')
      .select('*, orders(*)')
      .eq('status', 'open')
      .eq('type', 'ship')
      .lte('expires_at', now.toISOString());

    if (expiredShipJobs && expiredShipJobs.length > 0) {
      const { data: allShipOwners } = await admin
        .from('profiles')
        .select('*')
        .eq('role', 'ship_owner')
        .eq('suspended', false);

      const allShipOwnerIds = (allShipOwners as Profile[] || []).map((p) => p.id);

      for (const job of expiredShipJobs as (Job & { orders: Order })[]) {
        timeoutsProcessed++;
        const currentRadius = Number(job.radius_km || 15);

        if (currentRadius < 35) {
          // Radius expansion step: expand from 15km to 35km and offer to all online ship owners
          const newRadius = currentRadius + 20;
          const newExpiresAt = new Date(now.getTime() + 60 * 1000).toISOString();

          await admin
            .from('jobs')
            .update({
              radius_km: newRadius,
              expires_at: newExpiresAt,
              offered_to: allShipOwnerIds,
              status_history: [
                ...(job.status_history || []),
                {
                  status: 'expanded_radius',
                  at: now.toISOString(),
                  by: `system_radius_${newRadius}km`,
                },
              ],
            } as any)
            .eq('id', job.id);

          radiusExpansions++;

          // Send notification to newly added owners
          for (const ownerId of allShipOwnerIds) {
            await createProviderNotification(admin, {
              userId: ownerId,
              title: 'Expanded Radius Offer: Water Freight Job! 🚢',
              body: `Urgent boat needed for ${job.orders?.cargo_name || 'Cargo'}. Est payout: ₹${job.estimated_payout}`,
              data: {
                jobId: job.id,
                orderId: job.order_id,
                type: 'ship',
                estimatedPayout: job.estimated_payout,
              },
            });
            notificationsSent++;
          }
        } else {
          // If still nobody accepts after expansion, set order to Queued (open pool)
          await admin
            .from('orders')
            .update({ status: 'queued' })
            .eq('id', job.order_id);

          ordersQueued++;

          // If order ends up Queued, cancel associated unassigned taxi job and notify taxi
          const { data: taxiJobs } = await admin
            .from('jobs')
            .select('*')
            .eq('order_id', job.order_id)
            .eq('type', 'taxi')
            .eq('status', 'open');

          if (taxiJobs && taxiJobs.length > 0) {
            for (const tj of taxiJobs as Job[]) {
              await admin
                .from('jobs')
                .update({
                  status: 'cancelled',
                  status_history: [
                    ...(tj.status_history || []),
                    {
                      status: 'cancelled',
                      at: now.toISOString(),
                      by: 'system_boat_queued',
                    },
                  ],
                } as any)
                .eq('id', tj.id);

              if (tj.assigned_to) {
                await createProviderNotification(admin, {
                  userId: tj.assigned_to,
                  title: 'Pickup Job Cancelled',
                  body: 'The associated water vessel is awaiting operator assignment. Job cancelled for now.',
                  data: { orderId: job.order_id },
                });
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      processed_at: now.toISOString(),
      notifications_sent: notificationsSent,
      timeouts_processed: timeoutsProcessed,
      radius_expansions: radiusExpansions,
      orders_queued: ordersQueued,
    });
  } catch (error: any) {
    console.error('Cron tick error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
