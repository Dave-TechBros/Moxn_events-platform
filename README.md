# Moxn — Event Listings & Ticketing

A platform to **discover local events, RSVP or buy tickets, and receive a QR pass for entry**. Organizers create and manage listings; admins moderate and run door check-in.

Designed to feel **alive and time-sensitive** — sell-out counters, "starting soon" badges, live capacity indicators, and a transaction-minded registration flow (hold → confirm → issue ticket) that mirrors real pre-payment ticketing without a real payment gateway.

---

## Tech stack

- **Next.js 14** (App Router) + **TypeScript** — full-stack: React UI + Route Handlers for the API.
- **Tailwind CSS** + hand-composed **shadcn/ui** components (Radix primitives) — grayscale-first design, color used deliberately for urgency/category/status.
- **Prisma ORM** + **SQLite** (dev) / **PostgreSQL** (prod).
- **bcryptjs** for password hashing; signed **httpOnly session cookies** for auth.
- **date-fns-tz** for correct timezone handling (stored in UTC, displayed in event + viewer local time).
- **qrcode** for QR pass generation; **html5-qrcode** for the admin door scanner.
- **sonner** for success/error toasts.

## Design & engineering standards

- **Spacing scale** `4 8 12 16 24 32 48 64 96 px` and **type scale** `12 14 16 18 20 24 30 36 48 px` (body min 16px) — these map exactly to Tailwind's defaults, so no arbitrary in-between values are used.
- **HSL color tokens** with 5–9 shades per hue; semantic `success / warning / error / info` colors drive urgency cues (selling-fast = warning, sold-out = error).
- **One** border-radius set and **one** elevation/shadow scale (see `tailwind.config.ts` + `globals.css`).
- Accessible: semantic HTML, labeled inputs, visible focus rings, `prefers-reduced-motion` honored, alt text on cover images, 44×44px tap targets, full keyboard navigation.
- **Screen states** everywhere: skeletons (loading), empty states with CTAs, human-readable errors with recovery paths, toasts + QR reveal (success).
- **Logging** on the failure-critical paths (registration hold/confirm/cancel, check-in scan/success/reject) as structured JSON to stdout.

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env          # SQLite is the default; works out of the box

# 3. Create the database schema
npm run db:push

# 4. Seed realistic sample data (events, categories, organizers, attendees)
npm run db:seed

# 5. Run the dev server
npm run dev                   # http://localhost:3000
```

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` / `npm run typecheck` | Lint / type-check |
| `npm run db:push` | Sync Prisma schema to the database |
| `npm run db:seed` | Seed sample data |
| `npm run db:reset` | Wipe + reseed the database |

### Demo accounts (password `password123` for all)

| Role | Email | What you can do |
| --- | --- | --- |
| Admin | `admin@moxn.app` | Review/approve listings, manage categories, run check-in, view reports |
| Organizer | `nova@moxn.app` | Create/edit events, submit for approval, view dashboard |
| Attendee | `sam@moxn.app` | Browse, register, get QR pass, manage "My Events" |

You can also register a new Attendee or Organizer from `/register`.

---

## How the core problems are solved

### Date / timezone
All times are stored in **UTC**. Display uses `formatInTimeZone` for the **event's local timezone** (authoritative) and the **viewer's local timezone** (relatable). "Starting soon" / "sold out" / "past" states are derived from UTC timestamps + live capacity.

### Capacity enforcement (no overselling)
Reserving a ticket opens an **atomic DB transaction** (`reserveHold` in `src/lib/capacity.ts`) that:
1. Releases any expired holds (frees dead capacity),
2. Checks per-ticket-type limit **and** overall event roll-up,
3. Creates a `HOLD` and increments `soldCount` — all atomically, so concurrent requests can't oversell.

### Ticket / QR generation
Each confirmation mints a unique, unguessable `qrToken`. The QR encodes `MOXN:<token>`; validation is **server-side** (look the token up), so the code carries no secrets. The admin scanner validates in real time and marks the attendee checked-in (one scan = one entry).

### Transaction mindset (hold → confirm → issue)
Registration is a multi-step transaction: **HOLD** (capacity reserved, timer starts) → **CONFIRM** (mock payment → ticket issued, QR revealed) → **CANCEL/REFUND** (capacity released). Failures at any step are handled with clear, recoverable messages.

---

## API endpoints

All responses are JSON. Auth: send the `moxn_session` cookie (set on login/register).

### Auth
| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | — | Register (Attendee/Organizer) + start session |
| `POST` | `/api/auth/login` | — | Login + start session |
| `POST` | `/api/auth/logout` | — | End session |
| `GET` | `/api/auth/me` | — | Current user (or `null`) |

### Events & categories
| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/events` | — | List events (`?category=`, `?q=`, `?from=`, `?mine=1`, `?status=`) |
| `POST` | `/api/events` | Organizer/Admin | Create draft |
| `GET` | `/api/events/[id]` | — | Event detail + availability + stats |
| `PATCH` | `/api/events/[id]` | Owner/Admin | Edit; Admin may set `status`/`rejectionReason` |
| `DELETE` | `/api/events/[id]` | Owner/Admin | Delete draft/submitted |
| `POST` | `/api/events/[id]/submit` | Owner | Submit draft for approval |
| `POST` | `/api/events/[id]/cancel` | Owner/Admin | Cancel (releases holds) |
| `POST` | `/api/events/[id]/report` | User | Flag a listing |
| `GET` | `/api/categories` | — | List categories |
| `POST` | `/api/categories` | Admin | Create category |
| `PATCH`/`DELETE` | `/api/categories/[id]` | Admin | Update / delete category |

### Registrations (the transaction)
| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/registrations` | User | **Step 1 — reserve HOLD** (`{ticketTypeId, quantity}`) |
| `POST` | `/api/registrations/[id]/confirm` | Owner | **Step 2 — confirm** hold → issue ticket |
| `POST` | `/api/registrations/[id]/cancel` | Owner | Cancel HOLD or refund CONFIRMED |
| `GET` | `/api/registrations/me` | User | "My Events" (upcoming/past/holds) |
| `GET` | `/api/registrations/[id]/qr` | Owner | Reveal QR pass (CONFIRMED only) |

### Admin
| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/admin/events/[id]/review` | Admin | Approve (`{action:"APPROVED"}`) or reject (`{action:"REJECTED", rejectionReason}`) |
| `POST` | `/api/admin/checkin` | Admin/Organizer | Validate a scanned QR token in real time |
| `GET` | `/api/admin/reports` | Admin | Open flagged reports |
| `PATCH` | `/api/admin/reports/[id]` | Admin | Resolve a report |

---

## Deployment

The app is a single Next.js project (frontend + API in one deployable), so it deploys like any Next.js app. **No secrets are in the repo** — `.env` is gitignored.

### Option A — Vercel (easiest)
1. Push the repo to GitHub and import it in Vercel.
2. Add env vars: `DATABASE_URL` (a hosted **PostgreSQL** URL), `SESSION_SECRET` (generate a random 48-byte string), `NEXT_PUBLIC_APP_URL`, `HOLD_MINUTES`.
3. Set the build command to `npm run build` and install `prisma` (already a dep). After the first deploy, run `npx prisma db push` against the production `DATABASE_URL`, then `npm run db:seed`.
4. Vercel provides HTTPS + a real domain automatically.

### Option B — VPS / Docker (SQLite or Postgres)
1. `git clone`, `npm install`, `npm run build`.
2. For Postgres: set `DATABASE_URL` and run `npx prisma db push && npm run db:seed`.
   For SQLite: keep `DATABASE_URL="file:./prod.db"` and `prisma db push` (persist the `prisma/*.db` file via a volume).
3. Run `npm run start` behind a reverse proxy (Caddy/Nginx) with **HTTPS** (Caddy auto-TLS). Use a process manager (`systemd`/`pm2`) to keep it alive.

> Staging vs production: keep separate `.env.staging` / `.env.production` files with distinct `SESSION_SECRET` and database instances. Never reuse a dev secret in production.

---

## Project structure

```
prisma/
  schema.prisma        # data model (User, Category, Event, TicketType, Registration, Report)
  seed.ts              # realistic sample data
src/
  app/
    page.tsx           # browse (hero + filterable grid)
    login|register|profile
    events/[id]/       # event detail + registration transaction
    my-events/         # attendee's tickets & QR passes
    organizer/events/  # create / dashboard / edit
    admin/             # overview, review, categories, checkin, reports
    api/               # route handlers (auth, events, registrations, admin)
  components/          # ui/* (shadcn) + feature components
  lib/                 # prisma, auth, tz, capacity, qr, events, logger, validation, constants
```

## Accessibility floor (WCAG 2.2)
- Contrast ≥ 4.5:1; large-text 3:1 (semantic colors verified against the grayscale base).
- Full keyboard nav + visible focus states, including the filter controls and QR scanner UI.
- Semantic HTML and labeled inputs on every form.
- `prefers-reduced-motion` disables countdown/urgency animations.
- Alt text on all cover images; 44×44px minimum tap targets; mobile bottom nav.
