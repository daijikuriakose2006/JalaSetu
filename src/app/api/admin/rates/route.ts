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

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: rates, error } = await admin
      .from('rates')
      .select('*')
      .order('category')
      .order('key');

    if (error) throw error;
    return NextResponse.json({ rates: rates || [] });
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
    const { rates } = body; // Array of { key, value }

    if (!Array.isArray(rates)) {
      return NextResponse.json({ error: 'rates array required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const updatedRates = [];

    for (const r of rates) {
      if (r.key && r.value !== undefined) {
        const { data } = await admin
          .from('rates')
          .update({ value: Number(r.value), updated_at: new Date().toISOString() })
          .eq('key', r.key)
          .select()
          .single();
        if (data) updatedRates.push(data);
      }
    }

    return NextResponse.json({ success: true, updated: updatedRates });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
