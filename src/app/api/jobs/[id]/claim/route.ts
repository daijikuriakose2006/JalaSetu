import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createProviderNotification } from '@/lib/matching/dispatch';
import type { Job, Order, Profile } from '@/lib/types/database';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try calling the atomic Postgres RPC function first
    let claimed = false;
    try {
      const { data: rpcResult, error: rpcError } = await (supabase as any).rpc('claim_job', {
        p_job_id: id,
      });
      if (!rpcError && typeof rpcResult === 'boolean') {
        claimed = rpcResult;
      }
    } catch {
      // Fallback to direct atomic SQL update
    }

    // Direct atomic fallback using service role client if RPC was not used or failed
    if (!claimed) {
      const now = new Date().toISOString();
      const { data: updated, error: updateError } = await admin
        .from('jobs')
        .update({
          assigned_to: user.id,
          status: 'assigned',
          updated_at: now,
          status_history: [
            {
              status: 'assigned',
              at: now,
              by: user.id,
            },
          ],
        } as any)
        .eq('id', id)
        .eq('status', 'open')
        .select()
        .single();

      if (!updateError && updated) {
        claimed = true;
      }
    }

    if (!claimed) {
      return NextResponse.json(
        { success: false, message: 'This job has already been taken by another provider.' },
        { status: 409 }
      );
    }

    // Fetch job and order details
    const { data: job } = await admin.from('jobs').select('*, orders(*)').eq('id', id).single();
    const jobData = job as (Job & { orders: Order }) | null;

    if (jobData && jobData.orders) {
      const order = jobData.orders;

      // Update order status to 'matched' if it was posted or queued
      if (['posted', 'queued'].includes(order.status)) {
        await admin
          .from('orders')
          .update({
            status: 'matched',
            matched_at: new Date().toISOString(),
          })
          .eq('id', order.id);
      }

      // Notify the cargo owner
      const { data: providerProfile } = await admin
        .from('profiles')
        .select('name, role, vehicle_type')
        .eq('id', user.id)
        .single();

      const provider = providerProfile as Profile | null;

      await createProviderNotification(admin, {
        userId: order.user_id,
        title: 'Provider Assigned! 🤝',
        body: `${provider?.name || 'A provider'} accepted your shipment (${jobData.type.toUpperCase()}). Order is now Matched!`,
        data: {
          orderId: order.id,
          jobId: id,
          providerId: user.id,
          providerName: provider?.name,
          role: provider?.role,
        },
      });
    }

    return NextResponse.json({ success: true, message: 'Job successfully claimed!' });
  } catch (error: any) {
    console.error('Claim error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
