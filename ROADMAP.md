# Aruno Store — work plan

Tick a box only after the task actually works. One commit per task, followed by
one more commit that writes its hash into the ticked box.

Work done outside the roadmap still gets a task here, in the phase it fits, or in a
new phase if nothing fits. Trivial one-line fixes need no task of their own.

Long notes live at the bottom under **Task notes**, keyed by task number.

---

## Addendum — gotchas and conventions

Read this before writing code. Each line is a real trap that has already cost
time, not a style preference.

- **Migration numbers.** Two naming schemes on disk: `0001_profiles.sql` and
  Supabase's own `20261004133000_profiles_rls.sql`. Use `000N_name.sql`.
  `0003` taken. `0004`–`0005` Phase 2. `0006` task 3.1. `0007`–`0008` Phase 4.
  `0010`–`0015` P1 (dashboard tables). `0016` repairs two policies P1 created
  wrongly. `0009` taken, `0010` next free — gap deliberate. Phase 2 leftovers
  (2.11 staff update policy, 2.14 delivery image, 2.5 Storage) start at `0017`.
- **RLS on with no policy denies every row, silently.** `0003` sat unapplied for
  days — `getProfile()` returned null, `/account` said "Belum diisi", no error.
  A policy on a table whose RLS is *off* is inert. Check both.
- **Two roles: `buyer` and `staff`.** Artist is not a role. Verrel and Alfreza
  are both `staff`. Never branch UI or guards on `artist`.
- **Sign-up cannot grant `staff`.** `signUp()` hardcodes `role: "buyer"`, never
  reads role from FormData. Promotion is manual in Supabase. No role picker.
- **`profiles.role` is `text`, enforced by a `check`.** `0002` created a
  `user_role` enum (dead code); `0009` dropped it, constrains to `buyer | staff`.
- **Next 16 renamed `middleware.ts` to `src/proxy.ts`.** Guard is
  `SIGNED_IN_ROUTES` array. `/staff` not in it yet.
- **`cacheComponents: true` is on.** Session read behind a page needs
  `<Suspense>`, or `next build` fails on uncached data.
- **Render with `getClaims()`, never `getUser()`.** `getClaims()` wrapped in
  React `cache()`, verifies locally. `getUser()` hits Auth server — Server
  Actions and Route Handlers only.
- **`request_status` holds only `requested | quoted`.** Widen in own migration,
  one phase at a time.
- **Money is whole rupiah.** Store `15000`, never `15000.50`. Format at display.
- **`/staff` exists but is an empty shell.** 1.8 added page for guard testing;
  2.8 fills it. `0003` policy lets user read only own row — staff reading others'
  profiles needs own migration in 2.8.
- **A migration in git is not an applied migration.** Every migration is a manual
  dashboard step. Apply, then commit.
- **A `drop policy if exists "name"` can silently do nothing.** Read names as hex
  before trusting a dump: `encode(convert_to(polname,'utf8'),'hex')`.
- **Never read a table's shape from the dashboard's schema export.** It omitted
  four FKs and showed no `on delete` actions. Read `pg_constraint` and
  `pg_trigger`. Event triggers live in `pg_event_trigger`.
- **Paste migrations one statement at a time.** `0003` was pasted in a batch and
  aborted silently. Verify each: `select policyname, qual from pg_policies where
  tablename = 'profiles';`
- **Supabase Auth Email provider toggle.** Turning it off breaks sign-in for every
  account. Leave it on.
- **Sign-up errors swallowed in three places.** `login/actions.ts`,
  `auth/sign-up/actions.ts`, `lib/auth.ts` return null or generic message. Log
  `error.message` in development.
- **Signup route is `/auth/sign-up`**, not `/register`. Tested by `pendingPages.ts`.

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

**Closed.** Order mattered: **1.16 before 1.8** (guard protects route anyone can
walk into), **1.15 before 1.17** (data flipped before labels changed).

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

## Before Phase 2 — one prerequisite

Not a phase. A gate, because Phase 2 would otherwise build on schema that exists
only in the live database and in nobody's git history.

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
- [ ] **2.8** Staff list of all requests, newest first
- [ ] **2.9** Staff view of one request with a quote box: price and note
- [ ] **2.10** Saving the quote sets status `quoted`
- [ ] **2.11** Buyer's "my commissions" list with current status
- [ ] **2.12** Accept or decline a quote from the buyer side
- [ ] **2.13** Upload the finished drawing, visible to that buyer only
- [ ] **2.14** Status labels in plain language, not `in_progress`

## Phase 3 — Titipan (Alfreza's half)

Buyer sends a Japanese product link, staff quotes price + shipping + fee.

- [x] **3.1** Migration `0006_titipan_requests.sql`: link, size, colour, budget, quote split, tracking *(`ef5dbc6`)*
- [x] **3.2** Explain the service on the page: what a titipan is, what it costs *(`d3dd976`)*
- [ ] **3.3** Request form: product link, size, colour, quantity, budget
- [ ] **3.4** Save the form as a row with status `requested`
- [ ] **3.5** Staff queue of all requests, newest first
- [ ] **3.6** Quote box: item price, shipping, service fee, total computed automatically, plus a note
- [ ] **3.7** Save the quote, status becomes `quoted`
- [ ] **3.8** Buyer's "my titipan requests" list
- [ ] **3.9** Accept or decline a quote
- [ ] **3.10** Mark as purchased
- [ ] **3.11** Add courier and tracking number, status becomes `shipped`
- [ ] **3.12** Buyer marks it arrived

## Phase 4 — Payments (Xendit test mode)

Do this after both halves can reach "buyer accepts a quote".

- [ ] **4.1** Create the Xendit account, switch to test mode
- [ ] **4.2** Put the test secret key in `.env.local` and Vercel
- [ ] **4.3** Migration `0007_payments.sql`: order, amount, status, Xendit ids
- [ ] **4.4** Migration `0008_order_statuses.sql`
- [ ] **4.5** Server code that creates an invoice for an accepted quote
- [ ] **4.6** Checkout page that shows the amount and opens the payment
- [ ] **4.7** Webhook that marks the payment paid
- [ ] **4.8** Marking paid also moves the order forward to `paid`
- [ ] **4.9** Pay once with a fake card, confirm it works end to end
- [ ] **4.10** A "payment failed" path that does not advance the order

## Phase 5 — Nice to have, only if time allows

- [ ] **5.1** Staff overview: counts of open requests per status
- [ ] **5.2** Search and filter on both lists
- [ ] **5.3** Buyer leaves a rating after delivery
- [ ] **5.4** Curated titipan catalogue: staff list popular items, buyer adds to basket directly

**Built ahead of 5.4** The storefront had no page for ready-made goods at all —
`/shop`, reading `consignment_items`, using the table that was already there.
`pickThumb()` in `src/lib/shop.ts` is the only new logic, and it is tested. The
empty state is what renders today (0 rows); task 6.1 seeds the first items.
No migration: the table, its public-read policies and its category join were all
live already.

- [x] **5.5** `/shop` catalog page — grid of `consignment_items` with price, thumbnail, condition, category *(`282d434`)*

## Phase 6 — Submission

- [ ] **6.1** Seed data: a few services, artworks, sample requests
- [ ] **6.2** Test the whole flow once more on the live site, signed out
- [ ] **6.3** Write the demo script: what to click, in order
- [ ] **6.4** Screenshots of every page
- [x] **6.5** Rewrite `README.md`: what it is, how to run, how to test *(`9b6dddb`)*
- [ ] **6.6** Check nothing secret is in the repository
- [ ] **6.7** Custom domain, if time allows

---

## Cut list, if we run out of time

Drop in this order, and do not drop them silently — say so in the final write-up.

1. Phase 5, all of it.
2. Task 3.12 and 6.7.
3. Task 5.3 in phase 5 (already covered by the first cut).
4. Gallery uploads — use a link to an image instead.

Never cut: payment, login, or the quote step. They are the assignment.

---

## Known open items, not yet tasks

- **Every migration applied by hand.** All nine as of Phase 2 tables: `0001`–`0006`,
  `0009`, plus Supabase's own two. Check the database, not this file.
- **Sign-up escalation: closed by 1.16.** Role field gone, role hardcoded.
- **Verrel's login exists** and is `staff`. Both sellers reach `/staff`.
- **Test accounts in live DB.** `wagakami@gmail.com` (TESTO), `alamak@gmail.com`.
  Delete or keep `alamak` as standing buyer for guard tests.
- **Nothing applies migrations for us.** `git push` ships SQL text only. One
  Supabase project, one repo, two developers — apply once, tell the other person.
- **GitHub integration connected but does nothing.** No `supabase/config.toml`,
  no migration deployed by push. Before it could work: backfill
  `supabase_migrations.schema_migrations` by hand, and renumber the two
  Supabase-era files (`0010` sorts before `20261004150000` as strings).
- **`consignment_*` is a misnomer. Do not merge the two catalogs.** The site is
  two services: **Art Commission** (Verrel) and **Proxy Shopping** (Alfreza).
  `consignment_*` holds proxy-shopping goods, not consigned merchandise.
  Each service keeps its own tables —

  | Service | Catalog | Requests | Flow |
  |---|---|---|---|
  | Art Commission | `services`, `artworks` | `commissions` | quote first |
  | Proxy Shopping | `consignment_items` | `titipan_requests` | quote first |

  What they share is everything around the tables: `profiles`, one `buyer` /
  `staff` role, payments in Phase 4, one navbar, one cart. That is the whole of
  the unification — the tables stay separate because `condition`, `stock` and
  `consignor_id` mean nothing for an art piece, and `duration_days` means
  nothing for a boxed good.

- **Renaming `consignment_*` to `shop_*`: deferred, not rejected.** Feasible —
  six tables, thirteen policies, two functions, five triggers, plus the
  `'consignment'` value in `admins.store_role` and `email_notifications`.
  Zero TypeScript references today, so no code blocks it. Do it inside the
  Phase 4 payment migration, which already opens these tables. Until then,
  read them under a TypeScript name that matches the site instead:
  `ShopItem`, not `ConsignmentItem`. Users never see a table name; renaming
  now buys clarity in SQL at the cost of a migration nobody asked for.

- **Thirteen more tables, no migration file — now captured by P1.** `admins`,
  `users`, `commission_categories`, `commission_images`, `commission_orders`,
  `commission_order_references`, `consignment_categories`, `consignment_items`,
  `consignment_images`, `consignment_orders`, `consignment_order_items`,
  `consignors`, `email_notifications`. Overlap: `commission_orders` and
  `commission_categories` cover ground `commissions` and `services` also cover.
  Pick one before 2.3. Money columns are `numeric` — breaks whole-rupiah rule.
  `admins.store_role` allows three-role model Phase 1 deleted. Do not branch on it.
- **Confirming a commission order fails.** `handle_commission_order_confirmed()`
  updates `public.commissions` setting `used_slots`/`max_slots` (neither exists on
  our table), sets `status = 'closed'` (not in `request_status`). AFTER UPDATE
  trigger rolls back. Blocked on 2.3 overlap decision.
- **Commission orders cannot be inserted.** `notify_commission_order()` reads
  recipient with `where store_role = 'art_commission' limit 1`. Column defaults to
  `'consignment'`. Null address → `email_notifications.recipient_email` not null
  → insert raises, takes order insert with it. Needs admin set to `art_commission`
  by hand, or lookup changed.
- **Every admin policy hangs off one row of `admins`.** All thirteen `Admin
  kelola …` policies resolve admin-ness by reading `public.admins` under RLS,
  where admins' only select policy is `auth.uid() = id`. Tighten or drop it and
  all thirteen go false simultaneously — no error, just empty tables.
- **`consignment_items.stock` can go negative.** No `check (stock >= 0)`,
  `handle_consignment_order_confirmed()` decrements on confirmation.
- **Confirmed consignment item never goes back.** `status` only moves to
  `'terjual'`, never to `'tersedia'`.
- **`admins` update policy has no `with_check`,** so Postgres reuses the `using`
  clause — admin can update every column of own row, `store_role` included.
- **Lighthouse against the live site.** 1.12 and 1.13 changed every response shape,
  nothing measured the win yet. Do after next deploy.
- **Region mismatch.** Unknown whether Supabase and Vercel functions sit in same
  region. Measure before assuming.
- **No index on any FK, status or `created_at`.** Staff queue ordered newest first
  is a sequential scan until one is added.

---

## Task notes

**0.2** Hand-built, not `create-next-app`. Tailwind v4, no config file, theme in `globals.css`.

**0.3** Tokens `cream` / `plum` / `ink`. Fonts self-hosted via `next/font/google` as CSS variables.

**0.5** Project lived under partner's org. Noted `sb_publishable_` key format. Verified `/auth/v1/settings`, 200.

**0.6** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `.env.example` has names, no values.

**0.7** Both env vars set as Production and Preview. Navbar 404s on `/commissions` and `/titipan` — Phases 2 and 3.

**0.8** Deleted `index.html`, `login.html`, `register.html`, `css/style.css`, `js/script.js`. `assets/` stays.

**1.4** Route is `/auth/sign-up`, not `/register`. Role select offered all three roles; 1.16 removes `staff`.

**1.7** Guard covers `/account` (not `/dashboard`, removed in 1.14). Same shape, `proxy.ts`. Confirmed: 307 to `/login` signed out.

**1.8** Verified by hand: signed out → 307, Alfreza → renders, buyer → bounces. `proxy.ts` has `STAFF_ROUTES` and `isStaff()`. 11 tests in `proxy.test.ts`. Fails closed on missing row — fail-open would hand `/staff` to public.

Bug was never in this task: `0003` never applied, RLS on with zero policies. Three wrong diagnoses before `select * from pg_policies where tablename = 'profiles'` found it.

**1.10** Alfreza only. `tomomiogawa764@gmail.com` → `staff`, by hand. Verrel had no login yet (1.18).

**1.18** By hand, no commit. Verrel signed up (hardcoded `buyer`), then promoted. Both sellers reach `/staff`.

**1.9** `/account` reads `profiles` via `getProfile()` in `lib/auth.ts`. Role shown in words. `<Suspense>` boundary for prerender.

**1.10** Manual. `update public.profiles set role = 'staff' where email = 'alfreza@…'`. Check address first.

**1.15** `0009_staff_role_only.sql`. Order forced: update empties `artist` rows before check constraint added. Paste-twice safe. `to_regtype('public.user_role')` now null — enum gone.

**1.17** `details.tsx` drops `artist` from `ROLE_LABEL`/`ROLE_NOTE`. Test asserts no `Artist` label. Unknown role falls back to raw string.

**1.16** Role field gone from form. `actions.ts` hardcodes `role: "buyer"`. `actions.test.ts`: 6 cases — buyer, forged staff, forged artist, posted role never reaches Supabase, mismatched password, surfaced error. Forged cases verified by reintroducing old code and watching tests fail.

**2.4** `0017_artwork_storage.sql`: public `artworks` bucket + `artworks` table (title, storage_path). RLS: public read, staff write (pinned to `p.id = auth.uid()`). `next.config.ts` has `images.remotePatterns` for the Supabase storage CDN. Browser client at `src/lib/supabase/browser.ts` (`createBrowserSupabase`). Staff gallery at `/staff/artworks` — upload form + grid with delete. `ArtworkGallery` wrapped in `<Suspense>` (cacheComponents). No metadata table beyond title — sorting is backlog.

**2.5** `src/app/artworks/page.tsx` — public gallery at `/artworks`. Uses `'use cache'` for full prerender (no `<Suspense>`, no session read). Reads `artworks` table via `createPublicClient()` (cookie-less Supabase client at `src/lib/supabase/public.ts`) so the page can prerender at build time. Grid layout matches staff gallery (2 cols mobile, 3 cols sm+). Newest first. No test file — vitest/jsdom cannot render `'use cache'` components; `renderToStaticMarkup`, `renderToString`, and `renderToPipeableStream` all fail. Build + lint pass.

**2.6** `src/app/commissions/request/` — page.tsx (server, static frame) +
CommissionRequestForm.tsx (client) + actions.ts. Service dropdown is a
`request_status`-free plain select fed from active `services`; 2.3's listing is
unchanged. Page reads no session, so it prerenders — the dropdown sits behind
`<Suspense>` because `createClient()` touches cookies. `proxy.ts`
`SIGNED_IN_ROUTES` gains `/commissions/request`, not `/commissions`, so the
public listing stays open. CTA on `/commissions` now points at the form;
signed-out visitors are caught by the guard, and the sub-line keeps both
`/auth/sign-up` and `/login`.

`buyer_id` comes from `getUser()` in the action, never the FormData, and
`status` is hardcoded `requested` — same rule as the role field in 1.16, and
`actions.test.ts` forges both and asserts neither arrives. Reference links are
rejected unless http/https: `reference_links` is bare `text[]`, and staff will
render these as hrefs in 2.9, so a stored `javascript:` link would run then.
Dropping blanks is not an error — an untouched row of inputs must still submit.

Form logic is tested, not guessed: 8 tests in CommissionRequestForm.test.tsx
cover the dropdown, add/remove link and typing across inputs. `fireEvent`, not
`user-event` — not a dependency, and AuthSlot.test.tsx sets that precedent.

Not proved on the live DB: **the `services` table has 0 rows**, so the
populated dropdown has never rendered in a browser. 0004 has no write policy by
design, so seeding needs the SQL editor. The page shows an empty state instead
of a dead dropdown until 6.1 seeds. The insert against 0005's policy is also
unproven end to end for the same reason — `actions.test.ts` asserts the row the
action builds, not that RLS accepted it.

Commit `77f0601` covers 2.6 and 2.7 together: splitting them leaves a form that
cannot submit.

**2.1** `0004_services.sql`. Columns: `name`, `description`, `starting_price`, `duration_days`, `active`, `created_at`. Duration is integer days. No write policy — 6.1 seeds via SQL editor. Select policy `to anon, authenticated`, filters on `active` only.

**2.2** `0005_commissions.sql`. Same shape as 0006. Three policies, staff pinned to `p.id = auth.uid()`. No update policy until 2.10. `service_id` not null, `on delete restrict`. `reference_links` is `text[]`. `delivery_image` is plain text. `status` uses `request_status` as-is.

Both applied and verified. `0004` before `0005` (FK dependency). Paste-twice safe.

**P1** Six files `0010`–`0015`, written by Verrel (no creation SQL existed — only live DB). Every file opens with CAPTURED, NOT AUTHORED. Functions and triggers in 0015 (paste last — trigger needs function to exist). `update_updated_at()` serves four tables.

Dashboard schema export not authoritative — omitted four FKs, showed no `on delete` actions. Capture from `pg_constraint`. Trigger creation has no `if not exists` — each preceded by `drop ... if exists`. `ensure_rls` event trigger puts RLS on all 17 tables; lives in `pg_event_trigger`, invisible to `pg_trigger` queries. Only `ensure_rls` captured from 7 event triggers — other 6 are Supabase platform.

P1 not ticked until paste verified: 17 tables, 37 policies, RLS true on all 17. First paste came out 39 not 37 — `consignment_images` had misspelled `imaget_images` policies. `0016` repairs live DB. `0012` drops via `pg_policy` lookup.

Overlap: `commission_orders`/`commission_categories` do same work as `commissions`/`services`. P1 records both; choosing one is separate decision. 2.3 waits on it.

**3.1** `0006_titipan_requests.sql`. Table + RLS + 3 policies. Every column named by later tasks. No `total` column — `quoteTotal()` in `src/lib/quote.ts` is only source. `status` uses `request_status` as-is. Staff policy pinned to `p.id = auth.uid()` — bare `where p.role = 'staff'` reads every profile, 0003 denies it, empty queue. No update/delete policy until 3.7. Paste-twice safe.

Not proved: buyer can actually insert. Dashboard runs as `postgres` (ignores RLS). Real proof arrives with form at 3.4.

**3.2** `src/app/titipan/page.tsx` + `SERVICE_FEE = 25000` + `quoteTotal()` in `src/lib/quote.ts`. Reads no session — prerenders, no `<Suspense>`. Build shows `◐` (hole is `AuthSlot` boundary in layout). Fee marked `ponytail:`. Page test hardcodes `Rp 25.000`. `PENDING` removed from footer test same commit. Links point at `/auth/sign-up` and `/login` (both exist). Verified: 200 signed out, no console error, all hrefs 200. `/commissions` still 404 (pending Phase 2).

**6.5** Demo script and screenshots are 6.3 and 6.4.

**Future, catalog page** The storefront has no catalog of ready-made goods —
only `/commissions` (request custom work) and `/artworks` (a portfolio with no
prices). When that task comes, `consignment_items` is already a working
product table: name, description, price, stock, condition, status, category,
thumbnail, with public-read policies. Read it from `createPublicClient()`
behind `'use cache'`, the way `/artworks` does, and it prerenders with no
session and no `<Suspense>`. No new table, no migration. `price` is `numeric`
against the whole-rupiah rule; `formatRupiah` rounds at display, which is
enough until Phase 4 touches the column anyway. Name the type `ShopItem`.
Add the route to `MenuDrawer` and the footer.
