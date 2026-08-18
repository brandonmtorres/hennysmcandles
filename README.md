# Hennys M. Homemade Candles

An ecommerce site in two parts: a storefront, and a private portal where Hennys
runs the shop.

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL at least
npm run setup             # runs migrations and seeds the catalogue
npm run dev               # http://localhost:3000
```

Postgres is required — `DATABASE_URL` and `DIRECT_URL` both need to point at
one. There is no zero-configuration mode; a shop that keeps orders in a file
on a disk that its host wipes is not a shop.

Sign into the portal at **`/store-portal`** with the credentials in `.env`
(`PORTAL_OWNER_EMAIL` / `PORTAL_OWNER_PASSWORD`).

> **Change that password before going live.** The seeded one is a placeholder.
> Sign in, open **Security**, change it, and turn on two-factor authentication.

---

## The concept

The site takes the brand's own tagline literally: **night breaks into dawn and
back into night as you scroll.**

This is one continuous movement, not a stack of light and dark sections. A
single fixed backdrop sits behind the entire document and reads a `--dawn`
custom property that tracks how near the page's bright section is. The ground
warms from cold obsidian through ember to full wax-cream over roughly 1,450px
of scrolling, then cools again. Sections above it are near-transparent veils
rather than opaque fills, so the sky, the aurora and the warming ground stay
visible through them.

The transition at each end is a long fade — most of a viewport — carried by a
**moon that waxes as the light arrives and wanes as it leaves**, with a real
lunar terminator rather than a sliding bar. That turns what would be empty
ground into the most deliberate moment on the page.

Behind everything is a starfield on three depth layers that parallax apart as
you scroll, with dust motes drifting up through it and the occasional shooting
star. The stars fade out as dawn comes up, exactly as they should.

The palette is not invented — it is sampled from the product. Obsidian is the
matte vessel, wax-cream is the poured soy, gold is the lid foil, amethyst is
the crystal set into the surface and now carries the aurora behind the page.

Typography comes from the candle labels themselves, all three faces:
**Bodoni Moda** for the Didone scent names, **Jost** for the wide-tracked
geometric small caps, and **Allura** for the flowing signature script of the
wordmark, which carries the accent word in every headline and glows like it is
lit. All self-hosted through `next/font` — no external requests, which also
satisfies the Content Security Policy.

---

## Layout

```
src/
  app/
    (storefront)/          public site
      page.tsx             landing page
      products/            collection + /products/[slug]
      about/ ritual/ contact/ policies/[slug]
      checkout/success/
    store-portal/          private admin
      login/               sign-in + TOTP challenge
      (app)/               everything behind the auth guard
    api/
      checkout/            prices the cart, creates the Square payment link
      webhooks/square/     the only place orders are created
      newsletter/ contact/
  components/
    sections/  product/  cart/  layout/  portal/  visual/  brand/  ui/
  lib/
    db · auth · money · products · settings · validation · us-states
    order-number · rate-limit · words · square/{client,checkout,webhook}
    email/{send,templates}
```

**One app, not two.** The storefront and the portal share a database, a
deployment, and a design system; splitting them would mean syncing catalogue
data across a network boundary for no benefit.

---

## Part 1 — Storefront

| Route | What it is |
|---|---|
| `/` | Landing page — hero, collection, what's inside, the ritual, the maker, reviews |
| `/products` | Full collection |
| `/products/[slug]` | Scent pyramid, the crystal and its meaning, burn time, ingredients, story |
| `/ritual` | How to burn a hand-poured candle properly |
| `/about` | Hennys' story, in her own words |
| `/contact` | Form (honeypot + rate limited) and FAQ |
| `/policies/{shipping,privacy,terms}` | |

The cart is a slide-over drawer persisted to `localStorage`, with focus
trapping, `Escape` to close, and its contents removed from the tab order when
shut.

---

## Part 2 — Store portal (`/store-portal`)

- **Dashboard** — 30-day revenue, orders waiting to be packed, low stock, catalogue size
- **Products** — full CRUD; stock and visibility are editable inline in the list
  - Visibility is **Always**, **Never**, or **While in stock** (auto-hides at zero)
  - Sale is a percentage; the discounted price is *derived*, never stored, so it
    cannot drift out of sync with the list price
- **Orders** — filter, view, add tracking (emails the customer), refund in full or in part through Square
- **Settings** — shipping rates, free-shipping threshold, sales tax and the state it applies to, low-stock threshold, announcement bar
- **Security** — change password, enable TOTP two-factor, read the audit log

---

## How money and stock work

Payment runs through **Square's hosted checkout**, on Square's own page. Card
details never reach this server, which keeps PCI scope minimal and brings Apple
Pay, Google Pay, Cash App Pay and cards along without extra work. The same
Square account rings up candles at markets, so online and in-person takings
land in one place.

Four rules make the numbers trustworthy:

1. **The client never sends a price.** `/api/checkout` accepts product IDs,
   quantities and a destination state only. Every amount is read from the
   database. Editing `localStorage` changes nothing about what a customer is
   charged.
2. **Orders are created by the webhook, not the success page.** A browser can
   close before redirecting; a signed webhook is delivered regardless and
   retried until acknowledged.
3. **Stock moves inside the same transaction as the order.** The decrement uses
   a database-level `decrement`, so two simultaneous orders cannot read the same
   starting value and overwrite each other. A full refund puts the stock back; a
   partial one does not, because usually nothing is coming back.
4. **The webhook is a pointer, not data.** It says which payment changed; the
   amounts are then read back from Square's API and recorded as charged. What
   the shop quoted lives in a `CheckoutSession` row, and any disagreement
   between the two flags the order for the owner rather than being silently
   accepted.

Replays are handled three ways over: every Square event ID is recorded,
`Order.squareOrderId` is unique, and refunds are reconciled against the
payment's cumulative refunded total rather than added up event by event.

**An order is only created when a `CheckoutSession` matches it.** In-person
payments raise identical webhooks, and without that rule every sale made at a
market would appear as an unfulfilled web order and decrement online stock.

Order numbers come from an atomic counter, so two webhooks landing together
cannot be issued the same number and a deleted order cannot cause one to be
reused.

---

## Security

| Concern | How it is handled |
|---|---|
| Passwords | Argon2id (OWASP baseline: 19 MiB, t=2, p=1) |
| Sessions | Signed JWT in an httpOnly, SameSite=Lax cookie, 8-hour expiry |
| Session revocation | A `sessionEpoch` counter — changing the password invalidates every existing session |
| Two-factor | Optional TOTP; the QR code is drawn client-side so the secret never enters a URL or log |
| Account enumeration | Unknown emails are verified against a real decoy hash, so timing does not reveal which accounts exist |
| Brute force | Throttled per IP (10) and per email (5) per 15 minutes, stored in the database so it survives restarts |
| Authorization | `requireUser()` runs in the portal layout **and** at the top of every server action — routing is not an authorization boundary |
| Input | Zod schemas at every trust boundary; nothing is used before it is parsed |
| SQL injection | Prisma only; no raw SQL anywhere |
| XSS | React escaping throughout; the two `dangerouslySetInnerHTML` uses are a static script and JSON-LD with `<` escaped |
| Webhooks | Square's HMAC-SHA256 over notification URL + raw body, compared in constant time before anything is read |
| CSRF | Server Actions verify Origin; cookies are SameSite=Lax |
| Headers | CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy |
| Portal exposure | `noindex`, `no-store`, disallowed in `robots.txt`, and never linked from the public site |
| Audit | Every mutating action is written to an append-only log with IP |

---

## Going live

1. **Square** — create an application at developer.squareup.com and put its
   credentials in `.env`. Sandbox first: `SQUARE_ENVIRONMENT=sandbox` with the
   Sandbox access token and location id, and pay with card
   4111 1111 1111 1111. To go live, switch to the Production credentials and
   set `SQUARE_ENVIRONMENT=production`.

   Then subscribe a webhook to `https://your-domain/api/webhooks/square` for
   `payment.created`, `payment.updated`, `refund.created` and `refund.updated`,
   and copy its signing key into `SQUARE_WEBHOOK_SIGNATURE_KEY`. Put the same
   URL, character for character, in `SQUARE_WEBHOOK_URL` — Square signs the URL
   along with the body, so a mismatch there fails every delivery.

   Locally, expose the port with a tunnel and point the subscription at it.
2. **Sales tax** — set your state and its rate in the portal's Settings. Blank
   charges nobody, which is the setting it ships on; it is a decision to make
   knowingly, ideally with whoever does the books.
3. **Email** — set `RESEND_API_KEY` and verify your sending domain. Until then
   every email renders to `.mail-preview/` instead of sending, so you can read
   exactly what customers would receive. No code changes either way.
4. **Database** — Postgres. `DATABASE_URL` is the pooled connection the app
   runs on; `DIRECT_URL` bypasses the pooler and is used only by
   `prisma migrate`, which needs a real session to take locks. On a plain
   Postgres with no pooler, set both the same. Deploy migrations with
   `npm run db:deploy`.

   Coming from the old SQLite build?
   `node --experimental-sqlite scripts/migrate-sqlite-to-postgres.mjs` carries
   collections, settings, promo codes, subscribers and orders across, matching
   products by slug. It is safe to run twice.

5. **Product images** — set the `S3_` variables to any S3-compatible bucket
   (R2, S3, Spaces, Supabase). Leave them blank and uploads go to
   `public/uploads` on local disk, which is correct in development and wrong on
   any host that wipes its filesystem between deploys. The portal says so
   plainly if it is running in production without a bucket.
6. **Change the portal password** and turn on two-factor.
7. Set `NEXT_PUBLIC_SITE_URL` to the real domain and rebuild — it is baked in
   at build time.

---

## Tests

```bash
npm run build            # typecheck + production build
npm run check:email               # can this shop actually send mail?
npm run test:webhook              # order pipeline: pricing, signatures, stock, replays, refunds
node scripts/test-security.mjs    # trust boundaries: portal access, headers, escaping
node scripts/test-soldout.mjs     # a sold-out candle stays listed, and stays unbuyable
node scripts/test-ui.mjs          # navigation, cart, forms, a11y, no-JS, reduced motion
node scripts/test-navigation.mjs  # content populates on soft navigation, not just hard loads
node scripts/probe-arc.mjs        # the dusk-to-dawn arc is a gradient, not a hard edge
node scripts/test-timing.mjs      # login does not leak which accounts exist
node scripts/test-ratelimit.mjs   # sign-in throttling engages
```

Two of these exist because of bugs that were invisible to a screenshot:

- `test-navigation.mjs` — reveal animations queried the DOM once in a layout
  that never remounts, so every soft-navigated page stayed at zero opacity. It
  compares in-view reveals after a hard load against the same route reached by
  clicking.
- `probe-arc.mjs` — samples the page's actual ground colour every ~160px of
  scroll and counts how many samples land mid-transition. A hard block boundary
  scores zero or one; the current sunrise scores nine.

`test-webhook.mjs` needs no Square account at all. It stands up a stub of
Square's API, starts the built app pointed at it, and signs webhooks exactly as
Square does — so pricing, tax, signature verification, stock movement, replays,
partial and full refunds, and the in-person-sale rule are all proved offline.
Run `npm run build` first; it tests the built app.

Development helpers: `scripts/scroll-shots.mjs` (screenshots at real viewport
sizes across scroll positions — full-page captures break `sticky` and `svh`),
`scripts/portal-shot.mjs` (signs in first).
