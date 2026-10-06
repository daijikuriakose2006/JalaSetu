import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createProviderNotification } from '@/lib/matching/dispatch';
import type { Job, Order } from '@/lib/types/database';

export async function PATCH(
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

    const body = await request.json();
    const { status: newStatus } = body;

    const { data: job } = await admin
      .from('jobs')
      .select('*, orders(*)')
      .eq('id', id)
      .single();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const { data: myProfile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = myProfile?.role === 'admin';

    // Must be assigned to this user or admin
    if (job.assigned_to !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const statusHistory = [
      ...(job.status_history || []),
      {
        status: newStatus,
        at: now,
        by: user.id,
      },
    ];

    // Map provider sub-status into job_status enum if needed:
    // job status enum is: open, assigned, active, done, cancelled
    let dbJobStatus: string = job.status;
    if (['heading_to_pickup', 'heading_to_jetty', 'heading', 'in_transit', 'loaded'].includes(newStatus)) {
      dbJobStatus = 'active';
    } else if (['dropped', 'arrived', 'done'].includes(newStatus)) {
      dbJobStatus = 'done';
    } else if (newStatus === 'cancelled') {
      dbJobStatus = 'cancelled';
    } else if (newStatus === 'assigned') {
      dbJobStatus = 'assigned';
    }

    await admin
      .from('jobs')
      .update({
        status: dbJobStatus as any,
        status_history: statusHistory,
        updated_at: now,
      } as any)
      .eq('id', id);

    // Cascade to overall Order status
    const orderId = job.order_id;
    const { data: allOrderJobs } = await admin.from('jobs').select('*').eq('order_id', orderId);
    const jobs = (allOrderJobs as Job[]) || [];

    const order = job.orders as Order;

    if (order && order.status !== 'cancelled') {
      // Check if all jobs are done -> Delivered!
      const allDone = jobs.length > 0 && jobs.every((j) => j.id === id ? dbJobStatus === 'done' : j.status === 'done');
      if (allDone) {
        await admin
          .from('orders')
          .update({
            status: 'delivered',
            delivered_at: now,
          })
          .eq('id', orderId);

        // Notify user to rate
        await createProviderNotification(admin, {
          userId: order.user_id,
          title: 'Cargo Delivered! 🌟',
          body: `Your shipment "${order.cargo_name}" has arrived safely. Please rate your experience!`,
          data: { orderId: order.id, type: 'order_delivered' },
        });
      } else if (newStatus === 'in_transit' || newStatus === 'loaded') {
        await admin
          .from('orders')
          .update({
            status: 'in_transit',
            in_transit_at: now,
          })
          .eq('id', orderId);
      } else if (newStatus === 'picked_up' || dbJobStatus === 'active') {
        if (order.status === 'matched' || order.status === 'posted') {
          await admin
            .from('orders')
            .update({
              status: 'picked_up',
              picked_up_at: now,
            })
            .eq('id', orderId);
        }
      }
    }

    return NextResponse.json({
      success: true,
      jobStatus: dbJobStatus,
      step: newStatus,
    });
  } catch (err: any) {
    console.error('Job status update error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
