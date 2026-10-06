import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Job, Order } from '@/lib/types/database';

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const mineOnly = searchParams.get('mine_only') === 'true';
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    let query = admin.from('jobs').select('*, orders(*), order_legs(*)');

    if (mineOnly) {
      query = query.eq('assigned_to', user.id);
    } else {
      // Requests view: Open jobs offered to this user OR queued pool jobs
      // We query open jobs where offered_to contains user.id OR order status is 'queued'
      query = query.eq('status', 'open');
    }

    if (type) {
      query = query.eq('type', type as any);
    }
    if (status && mineOnly) {
      query = query.eq('status', status as any);
    }

    query = query.order('created_at', { ascending: false });

    const { data: jobs, error } = await query;
    if (error) throw error;

    // Filter requests in JS if not mineOnly to include offered_to OR queued orders
    let result = (jobs || []) as (Job & { orders: Order })[];
    if (!mineOnly) {
      result = result.filter((j) => {
        const isOffered = Array.isArray(j.offered_to) && j.offered_to.includes(user.id);
        const isQueued = j.orders?.status === 'queued';
        return isOffered || isQueued;
      });
    }

    return NextResponse.json({ jobs: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
