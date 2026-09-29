# Chebba Auto Car

Car rental and per-kilometre transfers. **Next.js 16 · TypeScript · Tailwind CSS v4 · PostgreSQL.**

## First run

```bash
npm install

# 1. put your PostgreSQL user and password in .env.local (DATABASE_URL)
# 2. create the tables, indexes, first data and the admin account
npm run db:setup

npm run dev          # http://localhost:3000
```

The admin signs in at `/connexion` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env.local`.
**The first thing to do is open `/admin/tarifs` and set the price per kilometre.**

## Pages

| Address | For | What |
| --- | --- | --- |
| `/` | everyone | Showcase, live prices |
| `/reserver` | everyone | Booking in 3 steps: trip → vehicle → contact details |
| `/connexion`, `/inscription` | clients | Sign in / sign up (also possible inside the booking) |
| `/compte` | clients | Next-trip hero (route sketch, status tracker, countdown), upcoming / history |
| `/compte/reservations/[id]` | clients | One booking: route, price, follow-up, WhatsApp, cancel (two taps) |
| `/compte/profil` | clients | Contact details, password change (signs out other devices) |
| `/notifications` | clients, admin | Bell: what happened to each reservation |
| `/admin` | admin | Dashboard: pending requests with one-tap confirm / refuse, today & tomorrow agenda, 14-day activity, month mix |
| `/admin/reservations` | admin | Opens on upcoming trips by departure time; status tabs with counts, search, quick actions |
| `/admin/vehicules` | admin | Fleet, daily price, per-vehicle km price |
| `/admin/tarifs` | admin | Price per km, fees, rules, contact details, frequent places |
| `/admin/clients` | admin | Client list, block / unblock |

## How a transfer is priced

```
km on the real road  ×  price per km          (vehicle rate, else the global rate)
  − round-trip discount
  + pick-up fee
  + night surcharge
  = total, never below the minimum price
```

The distance is computed by the server from the two points. The browser never sends a
distance or a price, so neither can be tampered with. The rate is frozen in the reservation:
changing tariffs later does not rewrite past bookings.

## Database

`db/migrations/*.sql`, applied in order by `npm run db:migrate` (each file runs once).
Every primary key is `serial`.

| Table | Purpose |
| --- | --- |
| `users`, `sessions`, `login_attempts` | Accounts, sign-in sessions, brute-force throttle |
| `cars` | Fleet and prices |
| `settings` | The single configuration row |
| `places` | Frequent places offered in one click |
| `reservations` | Rentals and transfers |
| `reservation_events` | Status history of each reservation |
| `notifications` | Bell notifications for clients and the team |

To change the schema, add a new file (`002_….sql`); never edit one that has been applied.

## Where things live

| Path | What |
| --- | --- |
| `src/lib/pricing.ts` | Pricing rules (shared by the site, the booking and the admin simulator) |
| `src/lib/server/booking.ts` | Trip checks, availability, reservation creation |
| `src/lib/server/geo.ts` | Address search and routing |
| `src/lib/server/auth.ts` | Passwords, sessions, access control |
| `src/app/actions/` | Everything that writes to the database |
| `src/lib/site.ts` | Showcase texts |
| `scripts/optimize-images.mjs` | Source photos → compressed AVIF/WebP (`npm run images`) |

## Notifications

| Event | Client | Agency |
| --- | --- | --- |
| Booking created | e-mail | bell + e-mail |
| Status changed by admin | bell + e-mail | — |
| Cancelled by the client | — | bell + e-mail |

- **Bell**: always on, stored in the `notifications` table.
- **WhatsApp**: one-tap links with the message already written (admin → client on each
  reservation, client → agency after booking and in the account). Free, no API account;
  a person still presses "send".
- **E-mail**: off until `SMTP_URL` is set in `.env.local`. Agency e-mails go to the contact
  e-mail set in `/admin/tarifs`. Mail is sent after the page has responded, so a slow mail
  server never delays a booking. Links in e-mails use `NEXT_PUBLIC_SITE_URL`, which is read
  when the site is built: set it, then run `npm run build`.

## Number plates

Registration numbers are never published. Every car photo that shows a plate declares its
four corners in `scripts/optimize-images.mjs` (`plate: [...]`), and the pipeline replaces it
with the brand plate (`PLATE_TEXT`). When adding a photo of a car, add its plate corners
before running `npm run images`, then check the result.

## Mobile

Most clients are on phones, so phones are the reference layout:

- bottom tab bar (Accueil / Réserver / Compte) below 768px
- booking: map first, action bar with the live price pinned at the bottom of the screen
- admin and client lists shown as cards below 1024px, tables above
- tap targets are at least 44px, form fields use 16px text (no zoom on iOS)
- notch and home-indicator spacing through safe-area insets

Checked at 320, 360, 375, 390, 412, 430, 600 and 768px wide, plus landscape.

## Before going live

- **Map services.** Address search, routing and map tiles use free public servers
  (Photon, OSRM demo, OpenStreetMap). They are fine for development and light use but have
  no availability guarantee and forbid heavy traffic. For production, host your own or use a
  paid provider and set `OSRM_URL`, `GEOCODER_URL`, `NEXT_PUBLIC_TILE_URL`.
- **HTTPS** is required in production (the session cookie is then sent over HTTPS only).
- Set `NEXT_PUBLIC_SITE_URL` to the real address.
- Several server instances: caches and the map rate limit are per process. Tariff changes
  reach other instances within 15 seconds.
