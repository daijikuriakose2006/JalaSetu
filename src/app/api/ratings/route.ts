import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
    const { order_id, to_user_id, rating, comment } = body;

    if (!order_id || !to_user_id || !rating) {
      return NextResponse.json({ error: 'order_id, to_user_id, rating required' }, { status: 400 });
    }

    // Insert or update rating
    const { data, error } = await admin.from('ratings').upsert(
      {
        order_id,
        from_user_id: user.id,
        to_user_id,
        rating: Math.min(5, Math.max(1, Number(rating))),
        comment: comment || null,
      },
      { onConflict: 'order_id,from_user_id,to_user_id' }
    ).select().single();

    if (error) throw error;

    return NextResponse.json({ success: true, rating: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');
    const toUserId = searchParams.get('to_user_id');

    let query = admin.from('ratings').select('*, profiles:from_user_id(name)');

    if (orderId) {
      query = query.eq('order_id', orderId);
    } else if (toUserId) {
      query = query.eq('to_user_id', toUserId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ ratings: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
