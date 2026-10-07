You are a senior full-stack engineer. Build "JalaSetu" (working name), a marketplace connecting cargo owners with inland water transport in Kerala, for a hackathon. Target scenario to demo: a construction company moves 8 tonnes of building material from Kochi to Alappuzha and compares road vs waterway on cost, time and CO2.

Work in the phases below. Finish a phase, tell me how to run and test it, then continue. Provide a README, .env.example, SQL migrations and a seed script.

STACK
- Next.js (App Router, TypeScript) + Tailwind, built as a PWA. Deploy on Vercel.
- Supabase: Postgres + PostGIS, Auth, Realtime, Row Level Security, pg_cron + pg_net.
- Leaflet + OpenStreetMap tiles. Road routing: OSRM (public demo server) with OpenRouteService as a fallback via env key.
- Geocoding: Nominatim (debounce, max 1 request/sec, send a proper User-Agent) or Photon.
- Water routes: hand-built graph of Kerala jetties and waterway edges (tables jetties, water_edges with distance_km and avg_speed_kmph), Dijkstra in TypeScript.
- LLM: Gemini with structured JSON output (responseSchema), model name from env GEMINI_MODEL. Call it only from server routes.
- Realtime: Supabase Realtime (Postgres changes + Presence). Do NOT use Socket.io.
- Scheduling: pg_cron every minute calls a secured route /api/cron/tick (Authorization: Bearer CRON_SECRET) through pg_net. Also provide a local dev script that hits the same route every 30 seconds.
- Optional: three.js (react-three-fiber), lazy-loaded on the landing hero only (small animated boat on waves). It must not load on dashboards.

ROLES AND AUTH
- Roles: user (cargo owner), ship_owner, worker (loading/unloading), taxi (ask vehicle type and capacity in tonnes at signup), admin.
- Signup: name, email, password, role (taxi also asks vehicle type + capacity). Admin is never selectable; seed one admin account.
- Sign in with email + password. Forgot password: enter email -> server generates a 6-digit OTP, stores only a hash with 10-minute expiry and max 5 attempts, rate-limits requests, emails it via Nodemailer using Gmail SMTP (GMAIL_USER, GMAIL_APP_PASSWORD from env) -> verify OTP -> short-lived reset token -> set a new password using the Supabase admin API. Never reveal whether an email exists.
- Enforce access with RLS and role checks in API routes. The service-role key is server-only.

DATA MODEL (PostGIS geography columns)
profiles(role, theme, vehicle_type, capacity_t, is_online, suspended), preferred_locations, boats(owner, capacity_t, cargo_types, home_jetty), jetties, water_edges, orders, order_legs(road_origin | water | road_destination), jobs(type: ship|taxi|load|unload, order_id, leg, status: open|assigned|active|done|cancelled, assigned_to, offered_to[], radius_km, expires_at, notify_at), notifications, live_locations(user_id, geog, job_id, updated_at), ratings, rates (editable), contact_messages, audit_log.

PHASE 1 - Foundation
Auth flows above, profiles, theme toggle (light/dark) saved to profile and localStorage, role-based routing, migrations, RLS, seed (admin, demo users, 12-15 real Kerala jetties with approximate coordinates looked up via Nominatim and flagged approximate, water edges).

PHASE 2 - User dashboard: chat booking
- ChatGPT-style chat. Gemini extracts: name, item, quantity/weight, needs_loading_unloading, date/time (default "now"; also "today" or a picked date/time), origin, destination. Ask follow-up questions for missing fields, then show an editable confirmation card with a checkbox for loading/unloading and a date-time picker.
- Geocode origin and destination. Build the multi-leg route: road (origin -> origin jetty, only if needed) -> water (jetty to jetty via Dijkstra) -> road (destination jetty -> destination, only if needed). Draw all legs on the map in different styles.
- Recommend vehicle type per road leg from weight and the taxi capacity table, and a boat type from weight and cargo type.
- Show a "Road vs Water" comparison card BEFORE confirmation: cost, time and CO2 for direct road versus the multi-leg waterway plan, with a short Gemini-written explanation. Compute numbers with a deterministic formula using the editable rates table (taxi base fare + per km by vehicle type, water cost per tonne-km, loading charge per tonne, CO2 per tonne-km). Show them as estimates.
- On confirm, create the order with status Posted. Show an order tracker: Posted -> Matched -> Picked up -> In transit -> Delivered, plus live map, provider details, and ratings after delivery.

PHASE 3 - Matching and dispatch (the core)
- Atomic claim: implement a Postgres function claim_job(job_id) that runs UPDATE jobs SET assigned_to = auth.uid(), status = 'assigned' WHERE id = job_id AND status = 'open' and treats 0 rows updated as "already taken". Every Accept button uses it. Add a concurrency test.
- Ship matching: score boats by distance to the ORIGIN JETTY (not the user's GPS), capacity >= cargo weight, cargo type, whether the boat's reachable water graph covers both jetties, and online status. "Now" orders offer to the nearest boats to the origin jetty. Orders for today or later dates also include owners whose preferred_locations include that jetty or area.
- Offer the job to the top N boats. If nobody accepts in 1 minute, expand the radius and re-offer. If still nobody accepts, set the order to Queued, which appears in every eligible boat's Requests tab as an open pool.
- Taxi sequencing: for orders at now / within 30 minutes, dispatch the origin taxi in parallel with ship offers, to taxis within 5 km or the nearest 5 online taxis with capacity >= weight; first to accept wins; cancel the taxi job and notify the taxi if the order ends up Queued. For future orders, dispatch the origin taxi at pickup - 30 min, and only if a ship has accepted. Dispatch the destination taxi when the boat's ETA to the destination jetty is about 30 minutes away.
- Loading/unloading workers (only if ticked): notify_at = max(now, pickup_time - 5h). The unloading job is created for the destination jetty with the same rule relative to the expected arrival time.
- The cron tick processes due notify_at values, 1-minute timeouts and radius expansion, and is idempotent.
- Every provider notification shows from, destination, date/time, item, quantity, estimated payout, and Accept/Cancel.

PHASE 4 - Provider dashboards (ship owner, worker, taxi)
All three share this layout, with three tabs:
1. Map tab (Uber-style): Leaflet map with the user's current location; browser geolocation streams to live_locations every 5-10 seconds while online (online/offline toggle). When a job is active, show the route to its destination.
2. My Jobs tab: accepted jobs. The provider must SELECT ONE as the current operation (active job); only then does the map show its route and does GPS attach to that job. Status buttons per role: taxi (heading to pickup -> picked up -> dropped at jetty), ship (heading to jetty -> loaded/departed -> in transit -> arrived), worker (heading -> loading/unloading started -> done). Order status derives from job statuses.
3. Requests tab: open and queued jobs they are eligible for. If the dashboard is open, incoming offers appear as a drop-down banner with Cancel and Accept (Realtime). Optionally add a Web Push fallback with VAPID keys.
Preferences: preferred locations (add/remove, picked on a map or by search) and light/dark mode. Boat owners also manage their boats (capacity, cargo types, home jetty).

PHASE 5 - Admin dashboard (admin role only)
- Active users now (Realtime Presence), with counts by role, and a live map of online providers.
- User management: search, filter by role, suspend/reactivate, delete, change role, verify providers.
- Orders and jobs: view all, filter by status, force-cancel, manually reassign.
- Operations: edit rates (pricing and CO2 factors), manage jetties and water edges, view contact messages, moderate ratings, audit log, simple analytics (orders, tonnes moved by water, CO2 saved, acceptance time).

PHASE 6 - Landing page
Hero (optional three.js animation), problem and impact, how it works, features per role, a live mini "Road vs Water" demo using the Kochi -> Alappuzha example, FAQ, and a Contact Us form saving to contact_messages (optionally emailed with the same SMTP). Responsive and accessible.

DESIGN
- Warm, low-intensity light background and medium "light dark" elements. Suggested tokens: light bg #F8F3EA, surface #FFFBF4, elements and text #4B5560, accent muted teal #3F7F83, border #E6DCCB. Dark mode: bg #1F1C19, surface #2A2622, elements #A7B0B8, same accent, slightly lightened. Define as CSS variables, and respect prefers-color-scheme as the default.
- Mobile-first, since providers use phones. Clean cards, rounded corners, minimal shadows.

QUALITY
- Validate all inputs with zod. Never expose keys to the browser. Rate-limit the LLM and OTP routes. Handle loading, empty and error states. Add a seeded demo script that creates the Kochi -> Alappuzha order and walks through matching. Note free-tier limits (Nominatim 1 req/s, public OSRM is demo-only, Supabase free projects pause when idle) in the README.