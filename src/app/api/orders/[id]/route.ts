import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
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

    const { data: order, error } = await admin
      .from('orders')
      .select('*, order_legs(*), jobs(*)')
      .eq('id', id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check authorization: order owner, assigned provider, or admin
    const isOwner = order.user_id === user.id;
    const isAssigned = (order.jobs || []).some((j: any) => j.assigned_to === user.id);
    const { data: myProfile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = myProfile?.role === 'admin';

    if (!isOwner && !isAssigned && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Enrich assigned provider details
    const assignedUserIds = (order.jobs || []).map((j: any) => j.assigned_to).filter(Boolean);
    let providers: any[] = [];
    if (assignedUserIds.length > 0) {
      const { data: provData } = await admin
        .from('profiles')
        .select('id, name, email, role, vehicle_type, capacity_t')
        .in('id', assignedUserIds);
      providers = provData || [];
    }

    // Get live locations for assigned jobs
    const jobIds = (order.jobs || []).map((j: any) => j.id);
    let liveLocations: any[] = [];
    if (jobIds.length > 0) {
      const { data: locs } = await admin
        .from('live_locations')
        .select('*')
        .in('job_id', jobIds);
      liveLocations = locs || [];
    }

    return NextResponse.json({
      order,
      legs: order.order_legs || [],
      jobs: order.jobs || [],
      providers,
      liveLocations,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
    const { status } = body;

    const { data: order } = await admin.from('orders').select('*').eq('id', id).single();
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { data: myProfile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = myProfile?.role === 'admin';

    if (order.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (status === 'cancelled') {
      if (!['posted', 'matched', 'draft'].includes(order.status) && !isAdmin) {
        return NextResponse.json({ error: 'Cannot cancel order in current state' }, { status: 400 });
      }

      await admin.from('orders').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', id);
      await admin.from('jobs').update({ status: 'cancelled' }).eq('order_id', id);

      return NextResponse.json({ success: true, status: 'cancelled' });
    }

    return NextResponse.json({ error: 'Invalid update action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
