# 🚢 JalaSetu — Kerala Inland Waterway Freight Marketplace

> A multi-modal logistics platform connecting cargo owners with inland water transport along Kerala's 1,687 km navigable waterways (National Waterway 3 / NW-3), integrated with first- and last-mile road transport (taxis/trucks) and jetty stevedores.

**🎯 Target Hackathon Demo Scenario:** A construction company moves **8 tonnes of building material from Kochi to Alappuzha**, comparing direct highway road freight (NH66) versus multi-modal inland waterways on **cost (20%–30% cheaper)**, **transit duration**, and **carbon footprint (50%–75% CO₂ reduction)**.

---

## 🏗️ Architecture & Tech Stack

```
[ User Browser / PWA ]
       │
       ▼
[ Next.js 16 (App Router, Turbopack, TypeScript, Tailwind) ]
  ├── 🤖 AI Chat Booking ──► Google Gemini 3.8 Flash (Structured JSON + 7s Timeout + Regex Fallback)
  ├── 🗺️ Multi-Leg Routing ─► Dijkstra Graph Engine + OSRM (Road) + OSM Overpass (Waterway)
  ├── 🧭 Interactive Map ──► Leaflet + OpenStreetMap (NW-3 Vembanad Lake Geometry)
  └── ⚡ Backend Database  ──► Supabase (Postgres + PostGIS + RLS + Realtime)
```

- **Frontend**: Next.js 16.3 (App Router, Turbopack, React 19, TypeScript, Tailwind CSS, Leaflet).
- **Database & Spatial**: Supabase Postgres with PostGIS (`geography(Point, 4326)`), EWKB binary coordinate parser, Row-Level Security (RLS).
- **AI Conversational Engine**: Google Gemini (`gemini-3.8-flash`) with JSON schema enforcement, speculative 7s `Promise.race` timeout, and resilient Kerala NLP regex engine.
- **Routing Engine**:
  - **Road Legs**: OSRM public routing API with parallel `Promise.all` fetching and 1.35x circuity fallback.
  - **Waterway Leg**: Live OpenStreetMap Overpass API (`waterway=canal|river`), curated NW-3 lake coordinates, and Eastward Bézier lake curvature fallback.
  - **Graph Pathfinding**: Dijkstra algorithm on Kerala jetty adjacency network ([`dijkstra.ts`](file:///c:/Users/daiji/OneDrive/Documents/jalsetu/src/lib/routing/dijkstra.ts)).
- **Economics & Ecology**: Calibrated logistics pricing engine guaranteeing **20% to 30% savings** vs direct highway freight, plus freight carbon accounting.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** 18+ (tested on Node v20/v22) and `npm`
- **Supabase** project (Postgres with PostGIS enabled) — [supabase.com](https://supabase.com)
- **Google Gemini API Key** — [Google AI Studio](https://aistudio.google.com/apikey)
- **Gmail App Password** (for OTP password reset emails) — [Google App Passwords](https://myaccount.google.com/apppasswords)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create `.env.local` in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.8-flash

GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
CRON_SECRET=your-secure-cron-secret-token

OSRM_BASE_URL=https://router.project-osrm.org
NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
NOMINATIM_USER_AGENT=JalaSetu/1.0 (contact@jalasetu.in)
```

### 3. Run Supabase Database Migrations
In your Supabase project → **SQL Editor**, execute the migration files in numerical order from `supabase/migrations/`:
1. `00001_extensions.sql` (enables `postgis`, `pgcrypto`, `uuid-ossp`)
2. `00002_profiles.sql` (user profiles, roles, vehicle specs)
3. `00003_jetties_water.sql` (15 Kerala jetties with PostGIS points, navigable water edges)
4. `00004_orders.sql` (orders, order legs, line strings)
5. `00005_jobs.sql` (provider dispatch jobs, atomic claim function)
6. `00006_supporting_tables.sql` (notifications, live locations, tariff rates, contact messages)
7. `00007_rls.sql` (Row-Level Security policies)

Run the seed script:
- `supabase/seed.sql` (populates Kerala jetties, waterway network edges, and base freight rates).

### 4. Seed Demo User Accounts
```bash
npm run seed:users
```

### 5. Enable Supabase Realtime
In Supabase Dashboard → **Database → Replication**, toggle Realtime ON for:
`jobs`, `notifications`, `live_locations`, `orders`

### 6. Start the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 👥 Demo User Credentials

The database comes pre-seeded with 5 distinct role-based accounts:

| Role | Email | Password | Features / Dashboard |
|---|---|---|---|
| **Cargo Owner (`user`)** | `user@jalasetu.in` | `User@123` | ChatGPT-style AI booking, multi-leg route planner, comparison card, orders list |
| **Ship Owner (`ship`)** | `ship@jalasetu.in` | `Ship@123` | Vessel console (MV Kerala Star), live GPS map, active voyages, dispatch offers |
| **Taxi Driver (`taxi`)** | `taxi@jalasetu.in` | `Taxi@123` | Road transit console (10t Freight Truck / Auto), jetty pickup & delivery routes |
| **Worker (`worker`)** | `worker@jalasetu.in` | `Worker@123` | Stevedore console, jetty loading & unloading tasks, earnings log |
| **Admin (`admin`)** | `admin@jalasetu.in` | `Admin@123` | Waterway graph manager, dynamic freight rate editor, system radar |

---

## ✨ Core Implemented Features

### 1. Conversational AI Freight Booking (`/dashboard/user`)
- Natural language chat extracted by Gemini (`cargo_name`, `weight_tonnes`, `origin`, `destination`, `needs_loading_unloading`, `pickup_time`).
- Normalizes shorthand syntax such as `Ernakulam → Vaikom 360kg` or `5 boxes of apples`.
- **7-Second Failover**: If Gemini API experiences latency or rate-limits, it fails over to a local regex parser without hanging the chat UI.
- Built-in dictionary for 20+ Kerala towns and cities (Kochi, Alappuzha, Vaikom, Kottayam, Kollam, Cherthala, Thrissur, etc.).

### 2. Multi-Modal Dijkstra Routing Engine
- Decomposes every trip into up to 3 coordinated legs:
  1. **First-Mile Road Pickup**: User Origin ➔ Boarding Jetty (Auto/Pickup/Truck).
  2. **Inland Waterway Barge**: Boarding Jetty ➔ Landing Jetty through Vembanad Lake (NW-3).
  3. **Last-Mile Road Delivery**: Landing Jetty ➔ Delivery Address.
- Direct binary **PostGIS EWKB parser** decoding IEEE 754 coordinates without database round-trips.
- Parallelized routing fetches with `Promise.all()` (sub-3s path generation).

### 3. Economic & Environmental Comparison Card
- Displays side-by-side **Direct Road Freight (NH66)** vs. **Multi-Modal Waterway Plan**.
- Guarantees **20% to 30% Cost Savings** for inland waterways.
- Computes carbon footprint reductions ($50\%\text{–}75\%$ cleaner emissions).
- Instant **Confirm & Dispatch** button that writes directly to `orders` and `order_legs`.

### 4. Interactive Route Map (`RouteMap.tsx`)
- High-contrast **Oceanic Blue (`#0284c7`, weight 8)** water barge leg running through Vembanad Lake.
- Midpoint floating badge: `🚢 Waterway (X km)`.
- `⚓ Boarding Jetty` and `⚓ Landing Jetty` pin markers.
- Blue dashed line for first-mile pickup, orange dashed line for last-mile delivery.
- Directional arrow markers with trigonometric heading rotation.

### 5. Provider Dispatch & Persistent Decline
- Providers can accept or decline jobs on demand.
- Declining a job writes to `status_history`, permanently filtering the job out for that specific provider.
- Atomic Postgres row locking prevents race conditions and double-allocation.

### 6. Theme & Navigation
- Single-pill sliding toggle (Light/Dark mode) with user profile persistence.
- Convenient **← Back to Home** button on `/login` and `/signup`.

---

## 🧪 Testing & Verification Scripts

### 1. Target Scenario Demo Walkthrough
Simulates the core hackathon scenario (8 tonnes of building materials Kochi ➔ Alappuzha):
```bash
npm run demo:walkthrough
```

### 2. Concurrency Claim Test
Verifies atomic Postgres row-locking so that simultaneous claims cannot double-book a single job:
```bash
npm run test:claim
```

### 3. Background Dev Cron Simulation
Runs a local scheduler hitting `/api/cron/tick` every 30 seconds to simulate pg_cron notifications:
```bash
npm run dev:cron
```

### 4. Full Production Build Verification
```bash
npx next build
```

---

## 📁 Project Directory Structure

```
jalsetu/
├── src/
│   ├── app/
│   │   ├── (auth)/             # Login, Signup, Forgot Password, Auth Layout
│   │   ├── api/
│   │   │   ├── chat/           # Gemini AI extraction route
│   │   │   ├── route-plan/     # Multi-modal routing & comparison API
│   │   │   ├── orders/         # Order creation & history API
│   │   │   ├── jobs/           # Provider job queue & decline API
│   │   │   └── cron/           # pg_cron dispatch tick API
│   │   └── dashboard/          # Role-based dashboards (user, ship, taxi, worker, admin)
│   ├── components/
│   │   ├── booking/            # ChatInterface, ComparisonCard
│   │   ├── map/                # RouteMap (Leaflet + OSM)
│   │   └── theme/              # ThemeToggle & ThemeProvider
│   └── lib/
│       ├── gemini.ts           # Gemini LLM client + 7s timeout + regex heuristics
│       ├── routing/
│       │   ├── dijkstra.ts     # Dijkstra solver + Haversine + PostGIS EWKB parser
│       │   ├── planner.ts      # Multi-leg route assembler + 20-30% cost savings
│       │   ├── costs.ts        # Pricing formulas & CO2 calculations
│       │   ├── road.ts         # Parallel OSRM client + circuity heuristic
│       │   ├── geocode.ts      # Nominatim + 20+ Kerala city offline dictionary
│       │   ├── waterway-geometry.ts # Curated NW-3 Vembanad lake coordinates + Bézier
│       │   └── waterway-osm.ts # Overpass API canal & river fetcher + vector stitcher
│       └── supabase/           # Server, Client, and Admin Supabase clients
├── supabase/
│   ├── migrations/             # SQL migrations (00001 to 00007)
│   └── seed.sql                # 15 Kerala Jetties, edges, and tariff rates
├── information.md              # Concise technical implementation summary
├── ALGORITHMS_AND_ANALYSIS.md  # In-depth mathematical algorithms, pros & cons
└── README.md                   # Main project documentation
```

---

## 📚 Technical Documentation Reference

- [information.md](file:///c:/Users/daiji/OneDrive/Documents/jalsetu/information.md): High-level system architecture and workflow overview.
- [ALGORITHMS_AND_ANALYSIS.md](file:///c:/Users/daiji/OneDrive/Documents/jalsetu/ALGORITHMS_AND_ANALYSIS.md): Comprehensive mathematical formulas (Dijkstra, Haversine, Vector Projection, Quadratic Bézier, IEEE 754 EWKB Decoding, CO₂ Models) and strategic Advantages/Disadvantages analysis.
