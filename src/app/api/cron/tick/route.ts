import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

    if (!authHeader || authHeader !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Phase 3 - Process due notify_at values, 1-minute timeouts, radius expansion
    // This is idempotent and runs every minute via pg_cron
    
    const results = {
      processed_at: new Date().toISOString(),
      notifications_sent: 0,
      timeouts_processed: 0,
      radius_expansions: 0,
    };

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error('Cron tick error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
