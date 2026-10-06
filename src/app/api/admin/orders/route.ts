import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return null;
  return user;
}

export async function GET(request: Request) {
  try {
    const adminUser = await checkAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const admin = createAdminClient();
    let query = admin
      .from('orders')
      .select('*, profiles:user_id(name, email), jobs(*), order_legs(*)')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status as any);
    }

    const { data: orders, error } = await query;
    if (error) throw error;

    return NextResponse.json({ orders: orders || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const adminUser = await checkAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const body = await request.json();
    const { orderId, action, newStatus, reassignJobId, newProviderId } = body;
    const admin = createAdminClient();

    if (action === 'force_cancel' && orderId) {
      await admin
        .from('orders')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', orderId);
      await admin.from('jobs').update({ status: 'cancelled' }).eq('order_id', orderId);
      return NextResponse.json({ success: true, message: 'Order force-cancelled' });
    }

    if (action === 'reassign' && reassignJobId && newProviderId) {
      await admin
        .from('jobs')
        .update({
          assigned_to: newProviderId,
          status: 'assigned',
          status_history: [
            {
              status: 'admin_reassigned',
              at: new Date().toISOString(),
              by: adminUser.id,
            },
          ],
        } as any)
        .eq('id', reassignJobId);

      return NextResponse.json({ success: true, message: 'Job reassigned' });
    }

    if (newStatus && orderId) {
      await admin.from('orders').update({ status: newStatus }).eq('id', orderId);
      return NextResponse.json({ success: true, message: `Status updated to ${newStatus}` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
