/**
 * Local dev cron script
 * Hits /api/cron/tick every 30 seconds for local development
 * 
 * Run: npx tsx scripts/dev-cron.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error('❌ Missing CRON_SECRET in .env.local');
  process.exit(1);
}

async function tick() {
  const timestamp = new Date().toISOString();
  try {
    const res = await fetch(`${APP_URL}/api/cron/tick`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    if (res.ok) {
      console.log(`[${timestamp}] ✅ Tick OK:`, JSON.stringify(data.results));
    } else {
      console.error(`[${timestamp}] ❌ Tick failed (${res.status}):`, data);
    }
  } catch (err) {
    console.error(`[${timestamp}] ❌ Tick error:`, (err as Error).message);
  }
}

console.log(`🕐 Dev cron started - hitting ${APP_URL}/api/cron/tick every 30s`);
console.log('   Press Ctrl+C to stop\n');

// Run immediately, then every 30 seconds
tick();
setInterval(tick, 30_000);
