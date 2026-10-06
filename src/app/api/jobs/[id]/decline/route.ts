import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/jobs/[id]/decline — Decline a job offer so it never shows again to this user
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

    // Fetch existing job
    const { data: job, error: fetchErr } = await admin
      .from('jobs')
      .select('id, offered_to, status_history, status')
      .eq('id', id)
      .single();

    if (fetchErr || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updatedHistory = [
      ...(Array.isArray(job.status_history) ? job.status_history : []),
      {
        status: 'declined',
        by: user.id,
        at: now,
      },
    ];

    // Remove user from offered_to list
    const updatedOfferedTo = Array.isArray(job.offered_to)
      ? job.offered_to.filter((uid: string) => uid !== user.id)
      : [];

    await admin
      .from('jobs')
      .update({
        offered_to: updatedOfferedTo,
        status_history: updatedHistory,
        updated_at: now,
      } as any)
      .eq('id', id);

    return NextResponse.json({
      success: true,
      message: 'Job offer declined. It will no longer appear in your requests.',
    });
  } catch (error: any) {
    console.error('Decline job error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
