# Aruno Store — work plan

Tick a box only after the task actually works. One commit per task, then one
more that writes its hash into the ticked box. Work done outside the roadmap
still gets a task here, in the phase it fits. Trivial one-line fixes need none.

**Hard cap: 200 lines**, checked by `ROADMAP.test.ts` in `npm test`. One line
per task, no essays — gotchas, defects and task notes live in `NOTES.md`.

---

## Phase 0 — Running and online

- [x] **0.1** `.gitignore` exists before any `npm install` *(`199ecaa`)*
- [x] **0.2** Next.js app in this repo, TypeScript, App Router *(`199ecaa`)*
- [x] **0.3** Artora palette `#fbfaf8` / `#a45d79` / `#1d1b20`, DM Sans + Playfair Display *(`12fc166`)*
- [x] **0.4** Shared navbar and footer as components *(`20b9af2`)*
- [x] **0.5** Supabase project exists, URL and anon key noted *(`05438b4`)*
- [x] **0.6** URL and anon key in `.env.local`, confirmed ignored *(`4da4914`)*
- [x] **0.7** Deploy to Vercel, site loads online *(`05438b4`)*
- [x] **0.8** Delete the three Artora HTML files and `css/`, `js/` *(`4962955`)*

## Phase 1 — Shared foundation

**Closed.** Order mattered: **1.16 before 1.8** (guard before anyone can walk
into the route), **1.15 before 1.17** (data flipped before labels changed).

- [x] **1.1** Migration `0001_profiles.sql`: id, email, full_name, role, created_at *(`0344c42`)*
- [x] **1.2** Migration `0002_enums.sql`: roles `buyer | artist | staff`, shared status list *(`4a1ae2e`)*
- [x] **1.3** Row level security on every table *(`98d2bb2`)*
- [x] **1.4** Sign-up page with role chosen at sign-up *(`41c43ba`)*
- [x] **1.5** Log in and log out *(`aeba6c7`)*
- [x] **1.6** Read the signed-in user in a server component *(`6984188`)*
- [x] **1.7** Keep signed-out visitors out of the signed-in pages *(`947fdc0`, `7d40284`)*
- [x] **1.8** Guard `/staff` so only `staff` can reach it *(`74e3375`)*
- [x] **1.9** Account page shows the user's name and role *(`b2bc581`)*
- [x] **1.10** Promote Alfreza to `staff` — manual, no commit *(manual)*
- [x] **1.11** Fix the dead sign-up link in the footer *(`5685a8c`)*
- [x] **1.12** Pages no longer wait on Supabase before they render *(`57fb5a4`)*
- [x] **1.13** Every page pre-built, served from the CDN *(`f5e59be`)*
- [x] **1.14** The shop is the landing page, no dashboard *(`b2bc581`)*
- [x] **1.15** Migration `0009_staff_role_only.sql`: flip `artist` rows to `staff`, drop `user_role`, constrain `role` *(`381ced3`)*
- [x] **1.16** Sign-up hardcodes `buyer`; no role field, no way to claim staff *(`7dadf4c`)*
- [x] **1.17** Account page shows two roles, no artist label *(`381ced3`)*
- [x] **1.18** Create Verrel's login and set the role to `staff` — manual *(manual)*
- [x] **1.19** Staff link renders server-side, so logging out hides it with no refresh *(`6e0d29b`)*

## Before Phase 2 — one prerequisite

A gate, not a phase: Phase 2 would otherwise build on schema that exists only
in the live database and in nobody's git history.

- [x] **P1** Migration files `0010`–`0014`: the thirteen tables built in the dashboard get written down *(`5b80bc5`)*

## Phase 2 — Commissions (Verrel's half)

The artist quotes a price for custom work, buyer accepts and pays.

- [x] **2.1** Migration `0004_services.sql`: what is offered, starting price, duration, active flag *(`47d19c4`)*
- [x] **2.2** Migration `0005_commissions.sql`: buyer, service, brief, reference links, quote, status, delivery image *(`8b56975`)*
- [x] **2.3** Public page listing the services *(`2117010`)*
- [x] **2.4** Artwork gallery from Supabase Storage, upload only for `staff` *(`56b79cf`)*
- [x] **2.5** Artwork gallery page *(`f816b38`)*
- [x] **2.6** Request form: pick a service, write the brief, add reference links *(`77f0601`)*
- [x] **2.7** Save the form as a row with status `requested` *(`77f0601`)*
- [x] **2.8** Staff list of all requests, newest first *(`c34914b`)*
- [x] **2.9** Staff view of one request with a quote box: price and note *(`c34914b`)*
- [x] **2.10** Saving the quote sets status `quoted` *(`c34914b`)*
- [x] **2.11** Buyer's "my commissions" list with current status *(`c34914b`)*
- [x] **2.12** Accept or decline a quote from the buyer side *(`1daf1a7`)*
- [x] **2.13** Upload the finished drawing, visible to that buyer only *(`86e56e1`)*
- [x] **2.14** Status labels in plain language, not `in_progress` *(`d1e23d8`)*

Prerequisites: 2.12 widens `request_status` in its own migration; 2.13 adds a
delivery-image bucket policy (`0018` left that column out on purpose).

## Phase 3 — Titipan (Alfreza's half)

Buyer sends a Japanese product link, staff quotes price + shipping + fee.

- [x] **3.1** Migration `0006_titipan_requests.sql`: link, size, colour, budget, quote split, tracking *(`ef5dbc6`)*
- [x] **3.2** Explain the service on the page: what a titipan is, what it costs *(`d3dd976`)*
- [x] **3.3** Request form: product link, size, colour, quantity, budget *(`a9ba3ff`)*
- [x] **3.4** Save the form as a row with status `requested` *(`a9ba3ff`)*
- [x] **3.5** Staff queue of all requests, newest first *(`59a6baa`)*
- [x] **3.6** Quote box: item price, shipping, service fee, total computed automatically, plus a note *(`1bc4c92`)*
- [x] **3.7** Save the quote, status becomes `quoted` *(`1bc4c92`)*
- [x] **3.8** Buyer's "my titipan requests" list *(`5f44734`)*
- [x] **3.9** Accept or decline a quote *(`4fe7673`)*
- [x] **3.10** Mark as purchased *(`c1c94b9`)*
- [x] **3.11** Add courier and tracking number, status becomes `shipped` *(`346d703`)*
- [x] **3.12** Buyer marks it arrived *(`2f9b0b8`)*
- [x] **3.13** Signing in from a guarded titipan page returns the buyer to it *(`5ea4d4d`)*

Prerequisites: 3.7 needs `0022` pasted, the first update to a row staff do not
own; it pins the quote columns so 3.9's buyer policy cannot reopen them. 3.9 needs
its own enum migration for accept/decline; 3.10 needs `purchased|shipped|arrived`.

## Phase 4 — Payments (Midtrans Snap Sandbox)

Do this after both halves can reach "buyer accepts a quote".

- [x] **4.1** Create the Midtrans account, stay in the Sandbox environment — manual, no commit *(manual)*
- [x] **4.2** Put the Sandbox Server and Client keys in `.env.local` and Vercel *(manual)*
- [x] **4.3** Migration `0033_payments.sql`: order, amount, snap token, Midtrans ids *(`b74556f`)*
- [x] **4.4** Migration `0034_payment_statuses.sql`: pending, settlement, deny, expire *(`b74556f`)*
- [x] **4.5** Server code that creates a Snap transaction for an accepted quote *(`b74556f`)*
- [x] **4.6** Shared `/checkout` page that shows the amount and opens Snap *(`2afd899`)*
- [x] **4.7** Webhook that verifies `signature_key` and marks the payment settled *(`2afd899`)*
- [x] **4.8** Marking settled also moves the order forward to `paid` *(`2afd899`)*
- [x] **4.9** Pay once in Sandbox with a fake card, confirm it works end to end *(`9fe4cd8`)*
- [x] **4.10** A `deny` or `expire` path that does not advance the order *(`cf1c48a`)*
- [x] **4.11** Sandbox pay flips the order to `paid`: plain-SHA512 signature, lowercase fraud, `0039` service-role trigger *(`347ed52`)*
- [ ] **4.12** Point Midtrans Notification URL at the Vercel webhook and live-retest one Sandbox pay end to end

## Phase 5 — Nice to have, only if time allows

- [ ] **5.1** Staff overview: counts of open requests per status
- [ ] **5.2** Search and filter on both lists
- [ ] **5.3** Buyer leaves a rating after delivery
- [x] **5.4** Curated titipan catalogue: staff list popular items, buyer adds to basket directly *(`faf6c43`)*
- [x] **5.5** `/shop` catalog page — grid of `consignment_items` with price, thumbnail, condition, category *(`282d434`)*
- [x] **5.6** Category row below the header on desktop, hamburger stays for mobile *(`1502455`)*
- [x] **5.7** Hero slideshow with the three photos behind the shop button *(`fc5e662`)*
- [x] **5.8** Header catalogues: `/shop/commission` + `/shop/titipan` filter by `consignment_items.showcase` (migration `0036`); staff form picks commission/titipan/keduanya; `/shop` unchanged *(`02a4c83`)*
- [x] **5.9** Product detail `/shop/[id]`, size selection (Fashion S-XL), cookie cart, Snap checkout for `shop_orders` (migrations `0037`, `0038`) *(`7208472`)*
- [x] **5.10** Product gallery carousel on `/shop/[id]`: arrows, clickable thumbnails, counter *(`0f0f7e7`)*
- [x] **5.11** Replace `/shop/orders` with unified `/checkout?type=shop` receipt *(`c108a5d`)*
- [x] **5.12** Fix false add-to-cart failure, add loading and success state *(`e3488c4`)*
- [x] **5.13** Buyer payment history at `/payments`: pending and settled per order, linked from the account menu *(`b4a966b`)*
- [x] **5.14** Buyer edits name and password at `/account/edit` (old password required, migration `0040`) *(`e312ffe`)*
- [x] **5.15** Staff shop uploads compress to WebP in browser, direct to Storage (fixes 1 MB Action limit) *(`f5be95a`)*
- [x] **5.16** Header search finds catalog items by name, results on `/shop?q=` *(`d600b47`)*

**5.5 was built ahead of 5.4**, using the table that was already live; the page
renders its empty state until 6.1 seeds rows.

## Phase 6 — Submission

- [x] **6.1** Seed data: a few services, artworks, sample requests *(`d2245ca`)*
- [ ] **6.2** Test the whole flow once more on the live site, signed out
- [ ] **6.3** Write the demo script: what to click, in order
- [ ] **6.4** Screenshots of every page
- [x] **6.5** Rewrite `README.md`: what it is, how to run, how to test *(`9b6dddb`)*
- [ ] **6.6** Check nothing secret is in the repository
- [ ] **6.7** Custom domain, if time allows
- [x] **6.8** Replace `admins` with `profiles` across all RLS policies, then drop table *(`21d0ebc`, `71f9d92`)*

---

## Cut list, if we run out of time

Drop in this order, and do not drop them silently — say so in the final write-up.

1. Phase 5, all of it.
2. Task 3.12 and 6.7.
3. Task 5.3 in phase 5 (already covered by the first cut).
4. Gallery uploads — use a link to an image instead.

Never cut: payment, login, or the quote step. They are the assignment.
