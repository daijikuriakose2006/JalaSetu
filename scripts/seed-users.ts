/**
 * Seed script for JalaSetu demo users
 * Run: npm run seed:users
 * 
 * Creates admin and demo users via Supabase Auth admin API.
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Validate the URL format
try {
  new URL(supabaseUrl);
} catch {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not a valid URL:', supabaseUrl);
  console.error('   It should look like: https://your-project-ref.supabase.co');
  process.exit(1);
}

console.log(`🔗 Connecting to: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface SeedUser {
  email: string;
  password: string;
  name: string;
  role: string;
  vehicle_type?: string;
  capacity_t?: number;
}

const seedUsers: SeedUser[] = [
  {
    email: 'admin@jalasetu.in',
    password: 'Admin@123',
    name: 'JalaSetu Admin',
    role: 'admin',
  },
  {
    email: 'user@jalasetu.in',
    password: 'User@123',
    name: 'Ravi Kumar (Cargo Owner)',
    role: 'user',
  },
  {
    email: 'ship@jalasetu.in',
    password: 'Ship@123',
    name: 'Suresh Boatman',
    role: 'ship_owner',
  },
  {
    email: 'taxi@jalasetu.in',
    password: 'Taxi@123',
    name: 'Anil Driver',
    role: 'taxi',
    vehicle_type: 'truck',
    capacity_t: 10,
  },
  {
    email: 'worker@jalasetu.in',
    password: 'Worker@123',
    name: 'Biju Worker',
    role: 'worker',
  },
];

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  try {
    // Simple health check — try listing users
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) {
      console.error('❌ Connection failed:', error.message);
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check that NEXT_PUBLIC_SUPABASE_URL is correct');
      console.error('   2. Check that SUPABASE_SERVICE_ROLE_KEY is the "service_role" key (not anon)');
      console.error('   3. Make sure your Supabase project is NOT paused (free projects pause after 1 week of inactivity)');
      console.error('   4. Go to https://supabase.com/dashboard and check your project status');
      return false;
    }
    console.log(`✅ Connected! (${data.users.length} existing user(s) found)\n`);
    return true;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ Connection error:', errMsg);
    if (errMsg.includes('fetch failed') || errMsg.includes('ENOTFOUND') || errMsg.includes('ECONNREFUSED')) {
      console.error('\n💡 This is a NETWORK error. Possible causes:');
      console.error('   1. Your Supabase project may be PAUSED — go to https://supabase.com/dashboard and restore it');
      console.error('   2. The URL may be wrong — double check NEXT_PUBLIC_SUPABASE_URL in .env.local');
      console.error('   3. Your internet connection may be down');
      console.error('   4. If behind a proxy/VPN, it may be blocking the request');
    }
    return false;
  }
}

async function seedDemoUsers() {
  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }

  console.log('🌱 Seeding demo users...\n');

  for (const user of seedUsers) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          name: user.name,
          role: user.role,
          vehicle_type: user.vehicle_type || null,
          capacity_t: user.capacity_t || null,
        },
      });

      if (error) {
        if (error.message.includes('already been registered') || error.message.includes('already exists')) {
          console.log(`⏭️  ${user.email} already exists, skipping`);
        } else {
          console.error(`❌ Failed to create ${user.email}:`, error.message);
        }
      } else {
        console.log(`✅ Created ${user.email} (${user.role}) — ID: ${data.user.id}`);
      }
    } catch (err) {
      console.error(`❌ Error creating ${user.email}:`, err instanceof Error ? err.message : err);
    }
  }

  // Seed a demo boat for ship_owner
  console.log('\n🚢 Seeding demo boat...');

  try {
    const { data: shipUsers } = await supabase.auth.admin.listUsers();
    const shipOwner = shipUsers?.users?.find((u) => u.email === 'ship@jalasetu.in');

    if (shipOwner) {
      const { data: jetties } = await supabase
        .from('jetties')
        .select('id')
        .eq('name', 'Ernakulam Boat Jetty')
        .single();

      if (jetties) {
        const { error: boatError } = await supabase.from('boats').insert({
          owner_id: shipOwner.id,
          name: 'MV Kerala Star',
          capacity_t: 15,
          cargo_types: ['building_material', 'sand', 'cement', 'general'],
          home_jetty_id: jetties.id,
          is_active: true,
          registration_number: 'KL-EKM-001',
        });

        if (boatError) {
          if (boatError.message.includes('duplicate') || boatError.message.includes('unique')) {
            console.log('⏭️  Demo boat already exists, skipping');
          } else {
            console.error('❌ Failed to create boat:', boatError.message);
          }
        } else {
          console.log('✅ Created demo boat: MV Kerala Star (15t, home: Ernakulam)');
        }
      } else {
        console.log('⚠️  Ernakulam jetty not found — did you run supabase/seed.sql?');
      }

      // Set ship_owner as online
      await supabase.from('profiles').update({ is_online: true }).eq('id', shipOwner.id);
    }

    // Set taxi as online
    const taxiUser = shipUsers?.users?.find((u) => u.email === 'taxi@jalasetu.in');
    if (taxiUser) {
      await supabase.from('profiles').update({ is_online: true }).eq('id', taxiUser.id);
      console.log('✅ Set taxi driver as online');
    }
  } catch (err) {
    console.error('⚠️  Boat seeding error:', err instanceof Error ? err.message : err);
  }

  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Demo Credentials:');
  console.log('─'.repeat(40));
  seedUsers.forEach((u) => {
    console.log(`  ${u.role.padEnd(12)} ${u.email} / ${u.password}`);
  });
}

seedDemoUsers().catch(console.error);
