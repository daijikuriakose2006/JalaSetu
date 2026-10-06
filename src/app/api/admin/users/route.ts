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
    const search = searchParams.get('search')?.toLowerCase();
    const role = searchParams.get('role');

    const admin = createAdminClient();
    let query = admin.from('profiles').select('*').order('created_at', { ascending: false });

    if (role && role !== 'all') {
      query = query.eq('role', role as any);
    }

    const { data: profiles, error } = await query;
    if (error) throw error;

    let filtered = profiles || [];
    if (search) {
      filtered = filtered.filter(
        (p: any) =>
          p.name.toLowerCase().includes(search) ||
          p.email.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ users: filtered });
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
    const { id, suspended, role, vehicle_type, capacity_t } = body;
    const admin = createAdminClient();

    const updates: any = {};
    if (suspended !== undefined) updates.suspended = Boolean(suspended);
    if (role) updates.role = role;
    if (vehicle_type !== undefined) updates.vehicle_type = vehicle_type;
    if (capacity_t !== undefined) updates.capacity_t = Number(capacity_t);

    const { data, error } = await admin
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ user: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminUser = await checkAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(id);
    await admin.from('profiles').delete().eq('id', id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
