# JalaSetu — Implementation Plan

> Full implementation roadmap for Kerala's Inland Water Transport Marketplace.
> This document covers all 6 phases plus future improvements.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                   │
│  Landing Page │ User Dashboard │ Provider │ Admin       │
│  (SSR/Static) │ (Chat+Map)     │ (Map+GPS)│ (Analytics) │
└────────────────────┬────────────────────────────────────┘
                     │ API Routes (Server-side)
┌────────────────────┴────────────────────────────────────┐
│              NEXT.JS API LAYER                          │
│  /api/chat  │ /api/orders │ /api/jobs │ /api/cron/tick  │
│  /api/route-plan │ /api/location │ /api/admin/*         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│               SUPABASE BACKEND                          │
│  Postgres + PostGIS │ Auth │ Realtime │ RLS │ pg_cron   │
│  Tables: profiles, orders, jobs, jetties, water_edges…  │
└─────────────────────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│             EXTERNAL SERVICES                           │
│  Gemini LLM │ OSRM/ORS │ Nominatim │ Gmail SMTP        │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1 — Foundation ✅

### Status: COMPLETE

### What was built:
- **Auth flows**: Signup, login, forgot password (OTP via email), reset password
- **Profiles**: Role-based (user, ship_owner, worker, taxi, admin)
- **Theme toggle**: Light/dark/system, saved to profile and localStorage
- **Role-based routing**: Dashboard redirects based on role
- **Database**: 7 migration files for all tables
- **RLS**: Row Level Security on all tables
- **Seed data**: Admin account, demo users, 15 Kerala jetties, water edges, rates

### Key files:
- `supabase/migrations/00001-00007_*.sql`
- `supabase/seed.sql`
- `src/app/(auth)/*` — Auth pages
- `src/app/api/auth/*` — Auth API routes
- `src/components/auth/AuthProvider.tsx`
- `src/components/theme/ThemeProvider.tsx`
- `scripts/seed-users.ts`

---

## Phase 2 — User Dashboard: Chat Booking

### Goal:
Cargo owners can book shipments through an AI chat interface, see route plans on a map, and compare road vs waterway costs.

### Components to build:

#### 2.1 Core Libraries
| File | Purpose |
|------|---------|
| `src/lib/routing/dijkstra.ts` | Dijkstra's shortest path on water graph |
| `src/lib/routing/road.ts` | OSRM/ORS road routing |
| `src/lib/routing/geocode.ts` | Nominatim geocoding with rate limiting |
| `src/lib/routing/planner.ts` | Multi-leg route planner |
| `src/lib/routing/costs.ts` | Cost/CO2 calculations |
| `src/lib/gemini.ts` | Gemini LLM integration |

#### 2.2 API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat` | POST | Chat with Gemini for booking extraction |
| `/api/route-plan` | POST | Plan multi-leg route |
| `/api/comparison` | POST | Generate road vs water comparison |
| `/api/orders` | GET/POST | List/create orders |
| `/api/orders/[id]` | GET/PATCH | Order detail/update |
| `/api/jetties` | GET | List jetties with coords |
| `/api/contact` | POST | Contact form submission |

#### 2.3 Frontend Components
| Component | Purpose |
|-----------|---------|
| `ChatInterface.tsx` | ChatGPT-style chat UI |
| `ConfirmationCard.tsx` | Editable booking confirmation |
| `ComparisonCard.tsx` | Road vs Water comparison |
| `RouteMap.tsx` | Leaflet map with route visualization |

#### 2.4 User Dashboard Pages
| Page | Purpose |
|------|---------|
| `/dashboard/user` | Main chat booking page |
| `/dashboard/user/orders` | Orders list |
| `/dashboard/user/orders/[id]` | Order tracker |
| `/dashboard/user/profile` | Profile settings |

### Implementation details:

**Chat Flow:**
1. User types message → POST /api/chat
2. Gemini extracts booking fields (structured JSON output)
3. Missing fields → follow-up question
4. All fields complete → show editable confirmation card
5. User confirms → POST /api/route-plan
6. Show comparison card (POST /api/comparison for Gemini explanation)
7. User confirms → POST /api/orders (creates order with status 'posted')

**Route Planning Algorithm:**
1. Geocode origin and destination
2. Find nearest jetties to both points
3. If origin IS a jetty (within 500m), skip road_origin leg
4. Run Dijkstra on water graph to find shortest water route
5. If destination IS a jetty, skip road_destination leg
6. Get OSRM road routes for road legs
7. Calculate costs using rates table
8. Also calculate full road-only route for comparison

**Cost Formulas:**
- Road: `base_fare[vehicle] + per_km[vehicle] × distance_km`
- Water: `water_cost_per_tonne_km × distance_km × weight_tonnes`
- Loading: `loading_charge_per_tonne × weight_tonnes` (per operation)
- CO2 Road: `co2_road_per_tonne_km × distance_km × weight_tonnes`
- CO2 Water: `co2_water_per_tonne_km × distance_km × weight_tonnes`
- CO2 Taxi: `co2_taxi_per_km × distance_km`

---

## Phase 3 — Matching and Dispatch

### Goal:
Automatically match orders with providers (boats, taxis, workers) using intelligent scoring and atomic job claiming.

### Components:

#### 3.1 Core Matching Logic
| File | Purpose |
|------|---------|
| `src/lib/matching/score.ts` | Scoring algorithms for boats, taxis, workers |
| `src/lib/matching/dispatch.ts` | Job creation and dispatch logic |

#### 3.2 API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/jobs/[id]/claim` | POST | Atomic job claim (uses claim_job PG function) |
| `/api/jobs/[id]/status` | PATCH | Update job status |
| `/api/jobs` | GET | List jobs for providers |
| `/api/cron/tick` | POST | Process timeouts, notifications, expansions |

#### 3.3 Cron Processing
The `/api/cron/tick` route runs every minute and processes:
1. **Due notifications**: Jobs where `notify_at <= now()` → create notification records
2. **Expired offers**: Jobs where `expires_at <= now()` and status = 'open'
   - If radius < max_radius: expand radius, re-offer
   - If radius >= max_radius: set order to 'queued'
3. **Idempotent**: Safe to run multiple times

### Matching Algorithms:

**Ship Matching Score (100 points):**
- Distance to origin jetty: 40 pts (closer = better)
- Capacity >= weight: 20 pts (tight fit preferred)
- Cargo type match: 20 pts (matching types)
- Reachability (both jetties in water graph): 10 pts
- Online status: 10 pts

**Taxi Matching:**
- Within 5 km of pickup OR nearest 5 online taxis
- Capacity >= weight
- First to accept wins (atomic claim)

**Worker Matching:**
- Proximity to the jetty
- Online status
- notify_at = max(now, pickup_time - 5 hours)

### Dispatch Timing:
| Job Type | "Now" Orders | Future Orders |
|----------|-------------|---------------|
| Ship | Immediate offer to top N boats | Same, but includes preferred_location matches |
| Origin Taxi | Parallel with ship offers | pickup_time - 30 min (only if ship accepted) |
| Dest Taxi | When boat ETA ≈ 30 min from dest jetty | Same |
| Loading | notify_at = max(now, pickup - 5h) | Same |
| Unloading | Based on expected arrival | Same |

---

## Phase 4 — Provider Dashboards

### Goal:
Ship owners, taxi drivers, and workers get Uber-style dashboards with maps, job management, and real-time notifications.

### Shared Components:
| Component | Purpose |
|-----------|---------|
| `ProviderMapTab.tsx` | Map with GPS streaming, online toggle |
| `MyJobsTab.tsx` | Job list with status updates |
| `RequestsTab.tsx` | Open/queued job offers with accept/decline |
| `JobOfferBanner.tsx` | Drop-down notification for new offers |

### Per-Role Pages:
Each provider role gets: Map, My Jobs, Requests, Profile pages.

### GPS Streaming:
- When online, use `navigator.geolocation.watchPosition`
- POST to `/api/location` every 5-10 seconds
- Attach to active job ID
- Stop when going offline

### Real-time Features:
- Subscribe to `jobs` table changes for new offers
- Subscribe to `notifications` for alerts
- New offer → drop-down banner with Accept/Cancel

### Status Transitions:
```
Taxi:   heading_to_pickup → picked_up → dropped
Ship:   heading_to_jetty → loaded → in_transit → arrived
Worker: heading → started → done
```

---

## Phase 5 — Admin Dashboard

### Goal:
Platform administrators can monitor, manage, and operate the marketplace.

### Pages:
| Page | Features |
|------|----------|
| Overview | Live stats, active users map, recent orders |
| Users | Search, filter, suspend, role change, delete |
| Orders | Filter, view, force-cancel, reassign |
| Rates | Edit pricing and CO2 factors |
| Waterways | Manage jetties and water edges |
| Messages | View contact form submissions |
| Audit Log | Action history with filters |

### Analytics:
- Total orders (by status)
- Tonnes moved by water
- CO2 saved (vs road transport)
- Average job acceptance time
- Revenue estimates

---

## Phase 6 — Landing Page

### Goal:
Public-facing landing page that sells the platform.

### Sections:
1. **Hero**: Tagline + CTA + optional three.js animated boat
2. **Stats**: Waterway length, cost savings, CO2 reduction
3. **Problem & Impact**: Why waterways matter
4. **How it Works**: 4-step process
5. **Features per Role**: Cargo owners, boat operators, taxi, workers
6. **Live Demo**: Road vs Water comparison for Kochi→Alappuzha
7. **FAQ**: Common questions with accordion
8. **Contact**: Form saving to contact_messages
9. **CTA**: Final call to action
10. **Footer**: Links and info

### three.js (optional):
- react-three-fiber for animated boat on waves
- Lazy-loaded ONLY on landing hero
- Must not load on dashboard pages
- Small, performant animation

---

## Future Improvements

### Short-term (Post-Hackathon):
1. **Web Push Notifications**: VAPID keys, service worker, push subscriptions
2. **Offline PWA**: Service worker caching for offline access
3. **Multi-language**: Malayalam + English support
4. **SMS Notifications**: For providers without smartphones
5. **Payment Integration**: Razorpay/UPI for online payments
6. **Insurance**: Cargo insurance integration
7. **Weather API**: Show weather conditions for water routes
8. **Bulk Booking**: Multiple shipments at once

### Medium-term:
1. **Mobile App**: React Native or Flutter native app
2. **Fleet Management**: Multiple boats per operator, crew management
3. **Analytics Dashboard**: Advanced charts, trends, forecasting
4. **API for Partners**: Public API for logistics companies
5. **Cargo Insurance**: Integrated insurance providers
6. **Dynamic Pricing**: Surge pricing based on demand/supply
7. **Route Optimization**: ML-based route optimization
8. **Carbon Credits**: Generate carbon credits from water transport

### Long-term:
1. **Expand Geography**: Other states with waterways (Goa, West Bengal, NE India)
2. **Autonomous Boats**: Integration with autonomous vessel systems
3. **Blockchain**: Transparent supply chain tracking
4. **Government Integration**: IWAI (Inland Waterways Authority) data feeds
5. **Intermodal**: Rail + water + road combination routing
6. **Marketplace**: Open marketplace for boat charter and rental

---

## Technical Debt & Known Limitations

### Free Tier Limits:
- **Nominatim**: 1 request/second, requires User-Agent
- **OSRM Public**: Demo server only, not for production
- **Supabase Free**: Project pauses after 1 week idle, 500MB storage, 2GB transfer
- **Gemini Free**: Rate limits apply

### Security Improvements Needed:
- Proper CSRF protection
- API rate limiting with Redis (currently in-memory)
- Input sanitization for XSS
- Content Security Policy headers
- Audit all RLS policies

### Performance Improvements:
- Database indexing optimization
- Query optimization for matching algorithms
- Caching layer (Redis) for frequently accessed data (jetties, rates)
- Image optimization and lazy loading
- Bundle size optimization

### Testing:
- Unit tests for Dijkstra, cost calculations, matching
- Integration tests for API routes
- E2E tests with Playwright
- Load testing for concurrent job claims
- Concurrency test for claim_job function

---

## Deployment

### Vercel Deployment:
1. Push to GitHub
2. Import to Vercel
3. Set all env vars from `.env.example`
4. Deploy

### Supabase Setup:
1. Create Supabase project
2. Run migrations in order (00001-00007)
3. Run seed.sql
4. Run `npm run seed:users`
5. Enable pg_cron and pg_net extensions
6. Set up cron job: `SELECT cron.schedule('tick', '* * * * *', ...)`
7. Enable Realtime on: jobs, notifications, live_locations, orders

### Environment Variables:
See `.env.example` for complete list.
