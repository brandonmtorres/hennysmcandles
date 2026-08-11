# Hennys M. Homemade Candles

An ecommerce site in two parts: a storefront, and a private portal where Hennys
runs the shop.

```bash
npm install
npm run setup     # creates the database and seeds the catalogue
npm run dev       # http://localhost:3000
```

Sign into the portal at **`/store-portal`** with the credentials in `.env`
(`PORTAL_OWNER_EMAIL` / `PORTAL_OWNER_PASSWORD`).

> **Change that password before going live.** The seeded one is a placeholder.
> Sign in, open **Security**, change it, and turn on two-factor authentication.

---

## The concept

The site takes the brand's own tagline literally: **a single light source
descends the page as you scroll.** The hero holds a real photograph of a
burning candle with a canvas of drifting embers over it; each section reads a
`--warmth` custom property and warms as the light reaches it, cooling again
behind it.

The palette is not invented — it is sampled from the product. Obsidian is the
matte vessel, wax-cream is the poured soy, gold is the lid foil, amethyst is
the crystal set into the surface. The page moves between the vessel's black and
the wax's cream, so it never reads as a generic dark template.

Typography follows the same rule. The candle labels pair a high-contrast
Didone in caps with wide-tracked geometric small caps, so the site uses
**Bodoni Moda** and **Jost**. Both are self-hosted through `next/font` — no
external font requests, which also satisfies the Content Security Policy.

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
      checkout/            creates the Stripe Checkout session
      webhooks/stripe/     the only place orders are created
      newsletter/ contact/
  components/
    sections/  product/  cart/  layout/  portal/  visual/  brand/  ui/
  lib/
    db · auth · stripe · money · products · settings · validation
    rate-limit · words · email/{send,templates}
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
- **Orders** — filter, view, add tracking (emails the customer), refund through Stripe
- **Settings** — shipping rates, free-shipping threshold, low-stock threshold, announcement bar
- **Security** — change password, enable TOTP two-factor, read the audit log

---

## How money and stock work

Payment runs through **Stripe Checkout**, Stripe's own hosted page. Card details
never reach this server, which keeps PCI scope minimal and brings Apple Pay,
Google Pay, Link and cards along without extra work.

Three rules make the numbers trustworthy:

1. **The client never sends a price.** `/api/checkout` accepts product IDs and
   quantities only. Every amount is read from the database. Editing
   `localStorage` changes nothing about what a customer is charged.
2. **Orders are created by the webhook, not the success page.** A browser can
   close before redirecting; a signed webhook is delivered regardless and
   retried until acknowledged.
3. **Stock moves inside the same transaction as the order.** The decrement uses
   a database-level `decrement`, so two simultaneous orders cannot read the same
   starting value and overwrite each other. A refund puts the stock back.

Replays are handled twice over: every Stripe event ID is recorded, and
`Order.stripeSessionId` is unique — so even a *new* event for an
already-processed session cannot create a second order.

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
| Webhooks | Stripe signature verified against the raw body before anything is read |
| CSRF | Server Actions verify Origin; cookies are SameSite=Lax |
| Headers | CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy |
| Portal exposure | `noindex`, `no-store`, disallowed in `robots.txt`, and never linked from the public site |
| Audit | Every mutating action is written to an append-only log with IP |

---

## Going live

1. **Stripe** — put live keys in `.env`, then register the webhook endpoint at
   `https://your-domain/api/webhooks/stripe` for `checkout.session.completed`
   and `charge.refunded`, and copy its signing secret into
   `STRIPE_WEBHOOK_SECRET`.
   Locally: `npm run stripe:listen`.
2. **Email** — set `RESEND_API_KEY` and verify your sending domain. Until then
   every email renders to `.mail-preview/` instead of sending, so you can read
   exactly what customers would receive. No code changes either way.
3. **Database** — SQLite is the default. For Postgres, change `provider` in
   `prisma/schema.prisma` and point `DATABASE_URL` at the new instance. No model
   changes are needed; enums are modelled as strings precisely so this holds.
4. **Change the portal password** and turn on two-factor.
5. Set `NEXT_PUBLIC_SITE_URL` to the real domain.

---

## Tests

```bash
npm run build            # typecheck + production build
node scripts/test-webhook.mjs     # order pipeline: signatures, stock, replays, refunds
node scripts/test-ui.mjs          # navigation, cart, forms, a11y, no-JS, reduced motion
node scripts/test-timing.mjs      # login does not leak which accounts exist
node scripts/test-ratelimit.mjs   # sign-in throttling engages
```

`test-webhook.mjs` signs payloads exactly as Stripe does, so the full order path
is verifiable without a live Stripe account.

Development helpers: `scripts/scroll-shots.mjs` (screenshots at real viewport
sizes across scroll positions — full-page captures break `sticky` and `svh`),
`scripts/portal-shot.mjs` (signs in first).
