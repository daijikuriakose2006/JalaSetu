# 🚢 JalaSetu — Kerala Inland Water Transport Marketplace

> Connect cargo owners with inland water transport across Kerala's 1,687 km of navigable backwaters.

**Hackathon Demo Scenario:** A construction company moves 8 tonnes of building material from Kochi to Alappuzha and compares direct road vs waterway on cost, transit time, and CO₂ emissions.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Supabase** project (Postgres + PostGIS) — [supabase.com](https://supabase.com)
- **Google Gemini API Key** — [Google AI Studio](https://aistudio.google.com/apikey)
- **Gmail App Password** (for OTP reset emails) — [Google App Passwords](https://myaccount.google.com/apppasswords)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
# Edit .env.local with your keys
```

### 3. Run Supabase Database Migrations
In your Supabase project → **SQL Editor**:
1. Enable extensions: `postgis`, `pgcrypto`, `uuid-ossp`
2. Run migrations in order from `supabase/migrations/`:
   - `00001_extensions.sql`
   - `00002_profiles.sql`
   - `00003_jetties_water.sql`
   - `00004_orders.sql`
   - `00005_jobs.sql`
   - `00006_supporting_tables.sql`
   - `00007_rls.sql`
3. Run the seed data script: `supabase/seed.sql` (seeds 15 real Kerala jetties, water edges, and tariff rates).

### 4. Seed Demo Users
```bash
npm run seed:users
```

### 5. Enable Realtime Publications
In Supabase Dashboard → **Database → Replication**, enable Realtime for:
`jobs`, `notifications`, `live_locations`, `orders`

### 6. Start the App
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## 🧪 Testing & Verification Scripts

### 1. Target Scenario Demo Walkthrough
Simulates moving 8 tonnes of building material from Kochi to Alappuzha, planning road vs water routes, calculating deterministic savings, and simulating dispatch:
```bash
npm run demo:walkthrough
```

### 2. Atomic Claim Concurrency Test
Tests that simultaneous claims on the same open job are strictly serialized by Postgres row-level locking so that exactly 1 provider wins and 0 double-bookings can occur:
```bash
npm run test:claim
```

### 3. Background Dev Cron Simulation
Runs a local scheduler hitting `/api/cron/tick` every 30 seconds to process due notifications and 1-minute timeout radius expansions:
```bash
npm run dev:cron
```

---

## 👥 Demo Credentials

| Role       | Email              | Password   | Notes |
|------------|--------------------|------------|-------|
| Admin      | `admin@jalasetu.in`  | `Admin@123`  | Full operations console, rates editor, analytics |
| Cargo Owner| `user@jalasetu.in`   | `User@123`   | Chat booking, route comparison, order tracker |
| Ship Owner | `ship@jalasetu.in`   | `Ship@123`   | Boat console, GPS map, 15t MV Kerala Star |
| Taxi       | `taxi@jalasetu.in`   | `Taxi@123`   | 10t Freight Truck driver console |
| Worker     | `worker@jalasetu.in` | `Worker@123` | Stevedore loading/unloading tasks |

---

## 🚢 Ship Capacity Analysis & Registration
- **Ship Owner Signup**: When registering with the `Ship Owner` role, the system prompts for:
  - **Ship Type**: Traditional Country Craft, Bulk Cargo Barge, Heavy Deck Barge, or Motor Vessel.
  - **Max Payload Capacity in KG**: Input in kilograms with dynamic tonne conversion (e.g. 15,000 kg = 15 tonnes).
- **Cargo Shipper Selection**: During booking confirmation, the shipper can view capacity analysis and choose from vessel tiers matching their payload weight.

---

## 📊 Completed Build Phases

- [x] **Phase 1 — Foundation**: Auth, roles (user, ship_owner, taxi, worker, admin), theme toggle (light/dark/system), migrations, RLS, seed data.
- [x] **Phase 2 — User Dashboard (Chat Booking)**: ChatGPT-style Gemini booking, geocoding, multi-leg route planner (Dijkstra + OSRM), vehicle and ship capacity recommendations, side-by-side road vs water comparison card with savings, order tracker with live map and post-delivery ratings.
- [x] **Phase 3 — Matching & Dispatch (Core)**: Atomic `claim_job(job_id)` function, concurrency test, distance-to-origin-jetty boat scoring, parallel taxi dispatches, labor preparation buffer, and idempotent 1-minute timeout cron.
- [x] **Phase 4 — Provider Dashboards**: Live Map tab with continuous GPS streaming to `live_locations`, My Jobs tab with active operation locking and role-specific status buttons, Requests tab with atomic claim buttons, real-time incoming offer banner, and fleet management for ship owners.
- [x] **Phase 5 — Admin Operations Console**: Live presence radar map, active user metrics, user directory moderation, order supervision with force-cancellation, editable tariffs with live Kochi -> Alappuzha simulation, and waterway graph manager.
- [x] **Phase 6 — Public Landing Page**: Hero with lazy-loaded animated boat canvas, interactive Kochi ➔ Alappuzha live weight demo slider, role feature breakdowns, FAQ, and contact form connected to `/api/contact`.

---

## ⚠️ Free Tier Limits & Production Notes

| Service       | Free Tier Behavior | Recommendation |
|---------------|-------------------|----------------|
| **Nominatim** | Max 1 req/s, requires custom User-Agent | Built-in throttle + fast local dictionary for Kerala cities |
| **OSRM**      | Public demo server (demo only) | Uses OpenRouteService fallback and circuity fallback |
| **Supabase**  | Free projects pause after 1 week inactivity | Restore project from Supabase dashboard if paused |
| **Gemini**    | Free tier rate limits apply | Built-in token bucket and fallback heuristic parser |
| **Gmail SMTP**| ~500 emails/day | Sufficient for hackathon OTP verification |

---

## 📄 Documentation Files

- `implementation.md`: Complete technical breakdown of implemented features, schemas, and endpoints.
- `implementation_plan.md`: Roadmap and future enhancement proposals.
