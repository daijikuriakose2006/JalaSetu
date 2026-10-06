# JalaSetu — Project Implementation Report

> Comprehensive technical documentation of the implemented features, data architecture, routing algorithms, multi-modal matching engine, and administrative operations.

---

## 1. System Overview & Tech Stack

JalaSetu is an inland water transport marketplace tailored for Kerala's backwater network (National Waterway 3), designed to shift heavy cargo off congested highways (such as NH66) onto cost-effective, low-emission water barges.

- **Frontend & App Framework**: Next.js 16 (App Router, TypeScript, Server Components + Client Components) with Tailwind CSS v4 and PWA manifest.
- **Database & Auth**: Supabase PostgreSQL with PostGIS extension for geography points and geometries, Supabase Auth with Row Level Security (RLS), and Realtime replication publications.
- **AI / LLM Integration**: Google Gemini (`@google/genai`) for conversational cargo booking extraction, follow-up clarification, and comparative feasibility explanations with in-memory rate limiting and fallback parsing.
- **Geocoding & Road Routing**: Nominatim OpenStreetMap geocoding with 1 req/sec debounce and Photon fallback; OSRM public demo server with GeoJSON polyline decoding and OpenRouteService fallback.
- **Waterway Graph & Pathfinding**: Hand-crafted graph of 15 authentic Kerala jetties across Vembanad Lake, bidirectional canal edges, and Dijkstra's algorithm implemented in TypeScript.
- **Scheduling & Idempotent Cron**: Secured `/api/cron/tick` route triggered every minute via `pg_cron` / `pg_net` and tested locally via `scripts/dev-cron.ts`.

---

## 2. Implemented Architecture & Data Model

### PostGIS & PostgreSQL Tables
All migrations are located in `supabase/migrations/`:
1. `00001_extensions.sql`: Enables `postgis`, `pgcrypto`, `uuid-ossp`.
2. `00002_profiles.sql`:
   - `profiles`: `id`, `name`, `email`, `role` (`user`, `ship_owner`, `worker`, `taxi`, `admin`), `theme`, `vehicle_type`, `capacity_t`, `is_online`, `suspended`, timestamps.
   - `preferred_locations`: Geographical operating zones for providers with `geog` Point and radius.
   - `password_reset_otps`: Hashed OTP storage with 10-minute expiry and attempt counter.
3. `00003_jetties_water.sql`:
   - `jetties`: 15 Kerala terminals with PostGIS geography coordinates, loading crane facilities, and district tags.
   - `water_edges`: Network topology connecting jetties with `distance_km`, `avg_speed_kmph`, and waterway names.
   - `boats`: Vessel registry with owner reference, `capacity_t`, `cargo_types`, and `home_jetty_id`.
4. `00004_orders.sql`:
   - `orders`: Cargo details, tonnage, origin/destination geography points, road and water comparison metrics, Gemini explanation, vehicle recommendations.
   - `order_legs`: Sequence of sub-routes (`road_origin`, `water`, `road_destination`) with distances, duration, and GeoJSON geometries.
5. `00005_jobs.sql`:
   - `jobs`: Subordinate provider dispatches (`ship`, `taxi`, `load`, `unload`), `status` (`open`, `assigned`, `active`, `done`, `cancelled`), `offered_to` array, `radius_km`, `notify_at`, `expires_at`, `estimated_payout`.
   - `claim_job(p_job_id)`: Atomic Postgres function for concurrency-safe job locking.
6. `00006_supporting_tables.sql`:
   - `notifications`: Real-time push and in-app alerts.
   - `live_locations`: GPS coordinate streams with heading and speed.
   - `ratings`: Star ratings and reviews between shippers and providers.
   - `rates`: Live editable tariff factors and CO₂ emission factors.
   - `contact_messages`: Public inquiries submitted from the landing page.
   - `audit_log`: System audit trails.
7. `00007_rls.sql`: Row Level Security policies enforcing data isolation across all roles.

---

## 3. Implemented Phases

### Phase 1: Foundation, Auth & Roles
- **Authentication**: Email and password signup, sign-in, session middleware (`src/lib/supabase/middleware.ts`), forgot password with 6-digit OTP verification and Nodemailer email dispatch.
- **Role-Based Workspaces**:
  - `user`: Cargo owner dashboard for booking and tracking.
  - `ship_owner`: Vessel fleet management, water navigation, job acceptance.
  - `taxi`: Road pickup and delivery console with vehicle payload configuration.
  - `worker`: Jetty stevedore operations with scheduled arrival buffers.
  - `admin`: Operations command center, user moderation, tariff editing.
- **Theme System**: Persisted light/dark/system theme switching with custom CSS tokens (`#F8F3EA` warm light background and `#1F1C19` dark mode).

### Phase 2: User Dashboard & Conversational Booking
- **Natural Language Booking Assistant** (`src/components/booking/ChatInterface.tsx`):
  - ChatGPT-style conversation powered by Google Gemini.
  - Automatically identifies cargo name, description, weight in tonnes, origin, destination, pickup time, and loading assistance needs.
- **Vessel & Vehicle Analysis with Recommendation Cards** (`src/components/booking/ConfirmationCard.tsx`):
  - Automatically analyzes cargo weight against taxi capacities (Auto, Pickup, Mini Truck, Heavy Truck, Trailer).
  - Analyzes vessel capacity against watercraft tiers (Traditional Country Craft up to 5t, Bulk Cargo Barge up to 15t, Heavy Deck Barge up to 50t, Tug-Assisted Barge up to 100t).
  - Allows cargo shippers to inspect capacities, view recommendations, and pick their preferred vessel and truck.
- **Multi-Modal Route Planner** (`src/lib/routing/planner.ts`):
  - Multi-leg route builder: `road_origin` (origin to origin jetty) + `water` (barge path via Dijkstra) + `road_destination` (destination jetty to delivery address).
  - Skips road legs if origin/destination is within 500m of a terminal.
- **Road vs Waterway Comparison Engine** (`src/components/booking/ComparisonCard.tsx`):
  - Side-by-side metrics: Distance, Duration, Cost (₹), and Carbon emissions (kg CO₂).
  - Deterministic calculations based on the editable rates table.
  - Executive feasibility assessment written by Gemini.
- **Order Tracker & Realtime Lifecycle** (`src/app/dashboard/user/orders/[id]/page.tsx`):
  - Step progress: Posted ➔ Matched ➔ Picked Up ➔ In Transit ➔ Delivered.
  - Provider cards showing assigned boat operators and taxi drivers.
  - Interactive Leaflet map displaying live coordinates.
  - 5-star rating submission form after delivery.

### Phase 3: Matching & Dispatch Engine
- **Atomic Job Claiming** (`src/app/api/jobs/[id]/claim/route.ts`):
  - Executes atomic row update `claim_job(p_job_id)`.
  - Concurrency verified with `scripts/test-atomic-claim.ts` (0 double bookings under simultaneous requests).
- **Intelligent Vessel Scoring** (`src/lib/matching/score.ts`):
  - Evaluates distance to origin jetty (40%), payload capacity match (20%), cargo compatibility (20%), reachability in waterway graph (10%), and online status (10%).
  - Matches preferred operating locations for scheduled orders.
- **Taxi & Labor Sequencing** (`src/lib/matching/dispatch.ts`):
  - Immediate orders dispatch road taxi in parallel with ship offers to online taxis within 5 km.
  - Scheduled future orders dispatch road taxi at `pickup_time - 30 minutes`.
  - Destination taxi dispatches when boat ETA is 30 minutes from terminal.
  - Loading stevedores notified with a 5-hour advance preparation buffer (`notify_at = max(now, pickup_time - 5h)`).
- **Idempotent Background Cron** (`src/app/api/cron/tick/route.ts`):
  - Processes due `notify_at` alerts.
  - Evaluates 1-minute expiration timeouts, expands search radius from 15km to 35km, and shifts unaccepted jobs to the open Queued pool.

### Phase 4: Provider Consoles (Ship Owner, Taxi, Worker)
- **Shared 3-Tab Console Layout**:
  - **Live Map Tab** (`src/components/provider/ProviderMapTab.tsx`): Real-time browser GPS tracking streaming coordinates to `live_locations` every 5-10 seconds while online. Displays active job route directions.
  - **My Jobs Tab** (`src/components/provider/MyJobsTab.tsx`): Displays accepted tasks. Enforces selecting one active operation to link live GPS tracking. Features role-specific status buttons:
    - Taxi: `Heading to Pickup` ➔ `Cargo Picked Up` ➔ `Dropped at Jetty/Dest`.
    - Ship: `Heading to Jetty` ➔ `Loaded & Departed` ➔ `In Transit (Backwaters)` ➔ `Arrived at Dest Jetty`.
    - Worker: `Heading to Jetty` ➔ `Loading Started` ➔ `Completed Work`.
  - **Requests Tab** (`src/components/provider/RequestsTab.tsx`): Lists open offers and queued pool orders with guaranteed payouts and one-tap atomic claim buttons.
- **Real-time Alert Banner** (`src/components/provider/JobOfferBanner.tsx`):
  - Floating top banner alerting providers of incoming dispatches with a 60-second countdown.
- **Fleet Management for Ship Owners** (`src/app/dashboard/ship-owner/boats/page.tsx`):
  - Register vessels with carrying capacity in kilograms and tonnes, home terminal bases, and cargo capabilities.

### Phase 5: Administrator Operations Dashboard
- **Telemetry Overview** (`src/app/dashboard/admin/page.tsx`):
  - Active users breakdown by role, total waterway tonnage moved, net CO₂ abated, and average vessel acceptance time.
  - Live Provider Presence radar map displaying active GPS coordinates.
- **User Directory** (`src/app/dashboard/admin/users/page.tsx`):
  - Real-time search, role filtering, suspension toggling, and role modification.
- **Global Order Control** (`src/app/dashboard/admin/orders/page.tsx`):
  - Inspect all multi-modal shipments, view subordinate dispatch jobs, and execute administrative force-cancellations.
- **Tariff & Factor Administration** (`src/app/dashboard/admin/rates/page.tsx`):
  - Edit base fares, per-km taxi rates, water freight tariffs (₹/tonne-km), and CO₂ coefficients.
  - Interactive simulator modeling the Kochi ➔ Alappuzha (8 Tonnes) scenario in real time.
- **Waterway Graph Management** (`src/app/dashboard/admin/waterways/page.tsx`):
  - Add terminals, configure crane capabilities, and inspect graph edges used by Dijkstra.
- **Inquiry Queue** (`src/app/dashboard/admin/messages/page.tsx`):
  - View commercial freight inquiries submitted from the public portal.

### Phase 6: Public Landing Page
- **Hero & Vessel Canvas** (`src/app/page.tsx` & `src/components/landing/HeroBoatCanvas.tsx`):
  - Lazy-loaded animated boat floating on water waves (isolated strictly to the landing hero).
- **Interactive Kochi ➔ Alappuzha Demo Calculator**:
  - Live weight slider (1 to 30 tonnes) demonstrating that moving 8 tonnes of building materials saves ~₹2,000 and cuts CO₂ by over 66% compared to highway trucks.
- **Role Workspaces & FAQ**:
  - Clear feature breakdown for Cargo Owners, Boat Operators, Taxi Drivers, and Labor Crews.
- **Contact Us Form**:
  - Directly connected to `/api/contact` with input validation and Nodemailer email integration.

---

## 4. Verification & Testing

1. **Demo Walkthrough Script** (`scripts/demo-walkthrough.ts`):
   - Successfully runs end-to-end simulation of the Kochi to Alappuzha 8-tonne building material scenario.
   - Outputs complete leg breakdowns, cost comparisons, and matching lifecycle.
   - Command: `npx tsx scripts/demo-walkthrough.ts`
2. **Atomic Concurrency Test** (`scripts/test-atomic-claim.ts`):
   - Simulates two providers claiming the same job at the same instant.
   - Confirms that exactly 1 provider wins and 0 double bookings occur.
   - Command: `npx tsx scripts/test-atomic-claim.ts`
3. **Local Dev Cron Script** (`scripts/dev-cron.ts`):
   - Periodically invokes `/api/cron/tick` every 30 seconds for background job processing during local development.
   - Command: `npx tsx scripts/dev-cron.ts`
