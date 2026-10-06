# 🚢 JalaSetu — Kerala Inland Water Transport Marketplace

> Connect cargo owners with inland water transport across Kerala's 1,687 km of navigable backwaters.

**Hackathon Demo Scenario:** A construction company moves 8 tonnes of building material from Kochi to Alappuzha and compares road vs waterway on cost, time, and CO₂.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Supabase** project (free tier works) — [supabase.com](https://supabase.com)
- **Gmail App Password** for OTP emails — [Google App Passwords](https://myaccount.google.com/apppasswords)
- **Gemini API Key** — [Google AI Studio](https://aistudio.google.com/apikey)

### 1. Install dependencies

```bash
cd jalsetu
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local with your actual keys
```

### 3. Set up Supabase database

1. Go to your Supabase project → **SQL Editor**
2. Enable extensions in **Database → Extensions**: `postgis`, `pg_cron`, `pg_net`
3. Run migrations **in order** from `supabase/migrations/`:
   - `00001_extensions.sql`
   - `00002_profiles.sql`
   - `00003_jetties_water.sql`
   - `00004_orders.sql`
   - `00005_jobs.sql`
   - `00006_supporting_tables.sql`
   - `00007_rls.sql`
4. Run the seed: `supabase/seed.sql`

### 4. Seed demo users

```bash
npm run seed:users
```

### 5. Enable Realtime

In Supabase Dashboard → **Database → Replication**, enable Realtime for:
`jobs`, `notifications`, `live_locations`, `orders`

### 6. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 7. (Optional) Local cron

```bash
npm run dev:cron
```

---

## 👥 Demo Credentials

| Role       | Email              | Password   |
|------------|--------------------|------------|
| Admin      | admin@jalasetu.in  | Admin@123  |
| User       | user@jalasetu.in   | User@123   |
| Ship Owner | ship@jalasetu.in   | Ship@123   |
| Taxi       | taxi@jalasetu.in   | Taxi@123   |
| Worker     | worker@jalasetu.in | Worker@123 |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, signup, forgot-password
│   ├── api/              # Server routes (auth, cron, profile)
│   ├── dashboard/        # Role-based dashboards
│   ├── globals.css       # Design system (CSS variables)
│   └── layout.tsx        # Root layout
├── components/
│   ├── auth/             # AuthProvider context
│   └── theme/            # ThemeProvider + ThemeToggle
├── lib/
│   ├── supabase/         # Client, server, admin, middleware
│   ├── types/            # Database types
│   └── validations.ts    # Zod schemas
└── proxy.ts              # Auth proxy (Next.js 16)

supabase/
├── migrations/           # 7 SQL migration files
└── seed.sql              # Kerala jetties + rates

scripts/
├── seed-users.ts         # Create demo users
└── dev-cron.ts           # Local cron (30s)
```

---

## 🛠 Scripts

| Command             | Description                              |
|---------------------|------------------------------------------|
| `npm run dev`       | Start dev server                         |
| `npm run build`     | Production build                         |
| `npm run seed:users`| Seed demo users                          |
| `npm run dev:cron`  | Local cron (30s interval)                |

---

## 🔑 Environment Variables

See `.env.example` — key variables:

| Variable                        | Required |
|---------------------------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅       |
| `SUPABASE_SERVICE_ROLE_KEY`     | ✅       |
| `GEMINI_API_KEY`                | ✅       |
| `GEMINI_MODEL`                  | ✅       |
| `GMAIL_USER`                    | ✅       |
| `GMAIL_APP_PASSWORD`            | ✅       |
| `CRON_SECRET`                   | ✅       |
| `NEXT_PUBLIC_APP_URL`           | ✅       |
| `ORS_API_KEY`                   | ❌       |

---

## 📊 Build Phases

- [x] **Phase 1** — Auth, profiles, theme, role-routing, migrations, RLS, seed
- [ ] **Phase 2** — Chat booking, Gemini, geocoding, Dijkstra, road vs water
- [ ] **Phase 3** — Atomic claim, ship/taxi/worker matching, cron dispatch
- [ ] **Phase 4** — Provider dashboards (map, jobs, requests)
- [ ] **Phase 5** — Admin dashboard
- [ ] **Phase 6** — Landing page with three.js, live demo

---

## ⚠️ Free Tier Limits

| Service       | Limit                                              |
|---------------|----------------------------------------------------|
| **Nominatim** | 1 req/s max, requires User-Agent header             |
| **OSRM**      | Public demo server — demo only, not production      |
| **Supabase**  | Free projects pause after 1 week inactivity         |
| **Gemini**    | Free tier: 15 RPM, 1M TPM, 1,500 RPD               |
| **Gmail SMTP**| ~500 emails/day                                     |

---

MIT License — Built for Hackathon
