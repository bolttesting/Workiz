# WORKIZ LMS

Platform-owned LMS. Individuals buy courses. Companies buy seats for the full catalog.

| Host | App | Port (local) |
|---|---|---|
| www | marketing (`educate` theme) | 3000 |
| learn | students + company admins (`edudash` shell) | 3001 |
| admin | course ops (`edudash` shell) | 3002 |
| api | Stripe, S3, PDFs, Resend, invites | 4000 |

HTML themes in `educate/` and `edudash-admin/` are visual source. The product lives in `apps/`.

## What v1 does

- Auth via hosted Supabase (cookie domain shared across subdomains)
- Catalog, Stripe Checkout for a course, Stripe Billing for seats
- HLS transcode worker (ffmpeg) + signed playback
- Quizzes, completion, PDF certificates and invoices
- Company invites with a hard seat cap
- Instructors (platform teachers, assigned to courses)
- Resend transactional email

Not in v1: Google Meet, instructor marketplace, school SIS modules, Arabic/RTL.

## Setup

1. Copy `.env.example` to `.env` and fill Supabase, S3/R2, Stripe, Resend, Redis.
2. In the Supabase SQL editor, run `0001_init.sql`, then `0002_seed.sql`, then `0003_instructors.sql`.
3. Create a user in Auth, then promote them:

```sql
update public.profiles set role = 'super_admin' where email = 'you@workix.com';
```

To add an instructor: create their login, then in Admin → Instructors promote them and assign a course.

4. In Stripe, create a **per-seat recurring price** and set `STRIPE_SEAT_PRICE_ID`. Point the webhook to `https://api.yourdomain/webhooks/stripe` (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`).
5. Auth emails: set Supabase SMTP to Resend, or keep Supabase’s built-in mail for confirm/reset.

```bash
pnpm install
pnpm dev
```

Local URLs: `http://localhost:3000` (web), `:3001` (learn), `:3002` (admin), `:4000` (api). Redis is required for transcode/PDF jobs (`docker compose -f infra/docker-compose.dev.yml up redis`).

**Local auth tip:** use plain `localhost` (not `www.localhost` / `admin.localhost`). Leave `COOKIE_DOMAIN` empty so the session cookie is shared across ports. After changing `.env`, restart `pnpm dev` and clear site cookies for `localhost` / `www.localhost`.

## Docker / VPS

```bash
docker compose -f infra/docker-compose.yml --env-file .env up -d --build
```

Put Cloudflare or CloudFront in front of the S3/R2 bucket. Do not proxy video through the VPS.

Set `COOKIE_DOMAIN=.workix.com` in production so www / learn / admin share the session.

## First content

Sign in as `super_admin` on `admin`, create a course, add modules and video lessons, upload a file, wait for transcode `ready`, then publish. Buy it from `www` or open it from a company seat on `learn`.
