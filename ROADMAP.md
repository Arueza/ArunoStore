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

- **Migration numbers.** Two naming schemes are on disk: `0001_profiles.sql` and
  Supabase's own `20261004133000_profiles_rls.sql`. Use the `000N_name.sql` form
  from here. `0003` is taken by `0003_profiles_select_policy.sql`, so the next
  free number is `0004`.
- **`0003_profiles_select_policy.sql` is written but never applied.** Until it
  runs in Supabase, `getProfile()` returns null and `/account` says "Belum diisi".
- **There are two roles: `buyer` and `staff`.** Artist is not a role. Verrel and
  Alfreza are the sole sellers, both `staff`, and what they sell differs, not
  what they can reach. Never branch UI or guards on `artist`.
- **Sign-up must never offer `staff`.** Today the form lists it and `signUp()`
  accepts it, so any visitor can self-promote. Promotion is a deliberate manual
  update, by design. Close this before task 1.8 or the guard protects nothing.
- **`profiles.role` is `text`, and nothing enforces its domain.** Migration `0002`
  created a `user_role` enum that is dead code. Migration `0009` drops it and adds
  a `check` constraint for `buyer | staff`.
- **Next 16 renamed `middleware.ts` to `src/proxy.ts`.** The signed-in guard is
  the `SIGNED_IN_ROUTES` array in `src/proxy.ts`. `/staff` is not in it yet.
- **`cacheComponents: true` is on.** Any read of the session behind a page needs a
  `<Suspense>` boundary, or `next build` fails on uncached data.
- **Render with `getClaims()`, never `getUser()`.** `getClaims()` is wrapped in
  React `cache()` and verifies locally, so a warm server does no network call.
  `getUser()` hits the Auth server and belongs only in Server Actions and Route
  Handlers.
- **`request_status` holds only `requested | quoted`.** Phases 2, 3 and 4 all need
  more values; widen the enum in its own migration, one phase at a time.
- **Money is whole rupiah.** Store `15000`, never `15000.50`. Format at display.
- **`/staff` has no route yet.** Tasks 1.8 and 2.8 both need one. The 0003 policy
  also lets a user read only their own row, so staff reading others needs its own
  migration.
- **A migration in git is not an applied migration.** `git push` moves SQL text;
  it never runs it. CI has no Supabase credentials and never calls
  `supabase db push`, so every migration is a manual dashboard step, and one has
  already been missed. Apply, then commit. See open items.
- **The signup route is `/auth/sign-up`,** not `/register`. Nav and footer links
  are tested against real files by `pendingPages.ts`.

---

## Phase 0 — Running and online

Nothing else can be tested until the project runs and is on the internet.

- [x] **0.1** `.gitignore` exists before any `npm install` *(`199ecaa`)*
- [x] **0.2** Next.js app in this repo, TypeScript, App Router *(`199ecaa`)*
- [x] **0.3** Artora palette `#fbfaf8` / `#a45d79` / `#1d1b20`, DM Sans + Playfair Display *(`12fc166`)*
- [x] **0.4** Shared navbar and footer as components *(`20b9af2`)*
- [x] **0.5** Supabase project exists, URL and anon key noted *(`05438b4`)*
- [x] **0.6** URL and anon key in `.env.local`, confirmed ignored *(`4da4914`)*
- [x] **0.7** Deploy to Vercel, site loads online *(`05438b4`)*
- [x] **0.8** Delete the three Artora HTML files and `css/`, `js/` *(`4962955`)*

## Phase 1 — Shared foundation

Login, the database, and the shared layout. Both halves need all of this.

Order matters twice: **1.16 before 1.8**, or the guard protects a route anyone can
walk into. **1.15 before 1.17**, so the data is flipped before the labels change.

- [x] **1.1** Migration `0001_profiles.sql`: id, email, full_name, role, created_at *(`0344c42`)*
- [x] **1.2** Migration `0002_enums.sql`: roles `buyer | artist | staff`, shared status list *(`4a1ae2e`)*
- [x] **1.3** Row level security on every table *(`98d2bb2`)*
- [x] **1.4** Sign-up page with role chosen at sign-up *(`41c43ba`)*
- [x] **1.5** Log in and log out *(`aeba6c7`)*
- [x] **1.6** Read the signed-in user in a server component *(`6984188`)*
- [x] **1.7** Keep signed-out visitors out of the signed-in pages *(`947fdc0`, `7d40284`)*
- [ ] **1.8** Guard `/staff` so only `staff` can reach it
- [x] **1.9** Account page shows the user's name and role *(`b2bc581`)*
- [ ] **1.10** Promote Verrel and Alfreza to `staff` — manual, no commit *(see note)*
- [x] **1.11** Fix the dead sign-up link in the footer *(`5685a8c`)*
- [x] **1.12** Pages no longer wait on Supabase before they render *(`57fb5a4`)*
- [x] **1.13** Every page pre-built, served from the CDN *(`f5e59be`)*
- [x] **1.14** The shop is the landing page, no dashboard *(`b2bc581`)*
- [ ] **1.15** Migration `0009_staff_role_only.sql`: flip `artist` rows to `staff`, drop `user_role`, constrain `role`
- [ ] **1.16** Sign-up cannot grant `staff` — drop it from the form, accept `buyer` only
- [ ] **1.17** Account page shows two roles, no artist label *(after 1.15)*

## Phase 2 — Commissions (Verrel's half)

The artist quotes a price for custom work, buyer accepts and pays.

- [ ] **2.1** Migration `0004_services.sql`: what is offered, starting price, duration, active flag
- [ ] **2.2** Migration `0005_commissions.sql`: buyer, service, brief, reference links, quote, status, delivery image
- [ ] **2.3** Public page listing the services
- [ ] **2.4** Artwork gallery from Supabase Storage, upload only for `artist`
- [ ] **2.5** Artwork gallery page
- [ ] **2.6** Request form: pick a service, write the brief, add reference links
- [ ] **2.7** Save the form as a row with status `requested`
- [ ] **2.8** Staff list of all requests, newest first
- [ ] **2.9** Staff view of one request with a quote box: price and note
- [ ] **2.10** Saving the quote sets status `quoted`
- [ ] **2.11** Buyer's "my commissions" list with current status
- [ ] **2.12** Accept or decline a quote from the buyer side
- [ ] **2.13** Upload the finished drawing, visible to that buyer only
- [ ] **2.14** Status labels in plain language, not `in_progress`

## Phase 3 — Titipan (Alfreza's half)

Buyer sends a Japanese product link, staff quotes price + shipping + fee.

- [ ] **3.1** Migration `0006_titipan_requests.sql`: link, size, colour, budget, quote split, tracking
- [ ] **3.2** Explain the service on the page: what a titipan is, what it costs
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

Do this after both halves can reach "buyer accepts a quote", otherwise there is
nothing to pay for.

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

- **Migration `0003_profiles_select_policy.sql` is written but not applied.** It
  has to run in Supabase before `/account` shows a name and role. Until then
  `getProfile()` returns null and the page says "Belum diisi". The other four
  migrations were applied by hand.
- **`/staff` has no route.** Tasks 1.8 and 2.8 both need it; the proxy guard for
  it is written but the page does not exist.
- **Sign-up currently lets anyone self-select `staff`.** `sign-up/page.tsx` offers
  it and `actions.ts` only checks the value is in its list, so any visitor can
  register as staff. Harmless while `/staff` is empty, a full escalation the moment
  1.8 lands. Task 1.16 closes it, and it must land before 1.8.
- **Nothing applies migrations for us.** `git push` ships SQL text only; CI runs
  build, lint and test, and has no Supabase credentials, so there is no
  `supabase db push` anywhere. Every migration is a manual step in the Supabase
  dashboard, which is why `0003` is still unapplied. Both of us share one project,
  so apply it once — but tell the other person, because their local code has to
  expect the new schema.
- **Lighthouse against the live site.** 1.12 and 1.13 changed the shape of every
  response, but nothing has measured the win yet. Do it after the next deploy.
- **Region mismatch.** Unknown whether Supabase and the Vercel functions sit in
  the same region. Measure before assuming; move whichever side is cheap to
  move.

---

## Task notes

Everything that used to sit under a task, kept per task number.

**0.2** Hand-built, not `create-next-app`. Tailwind v4 added early by choice — no
config file, theme lives in `globals.css`.

**0.3** Tokens `cream` / `plum` / `ink`. Fonts self-hosted via `next/font/google`
as CSS variables, so the theme can reference them.

**0.5** The project already lived under the partner's org; no second one was made.
Noted the new-format `sb_publishable_` key, not the secret key. Verified with
`/auth/v1/settings`, 200.

**0.6** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
`.env.example` carries the two names, no values.

**0.7** Both env vars set as Production and Preview. The key is not provable in
any JS chunk until `src/` reads it. Navbar 404s on `/commissions` and `/titipan`;
those land in Phases 2 and 3.

**0.8** Deleted `index.html`, `login.html`, `register.html`, `css/style.css`,
`js/script.js`. `assets/` stays — raw media staging.

**1.4** The route is `/auth/sign-up`, not `/register`. The role select arrived here
and offered all three roles; task 1.16 removes `staff` from it.

**1.7** Written for `/dashboard`, which task 1.14 then removed. The guard itself
lives on and now covers `/account`: same shape, same place, `proxy.ts`. Confirmed
by hand — `/account` answers 307 to `/login` signed out.

**1.8** Needs 1.16 first. The guard checks `profiles.role` is `staff`, but
sign-up lets anyone claim that today, so the guard would hand `/staff` to the
public.

**1.9** Now `/account`, not `/dashboard`. Reads the `profiles` row through
`getProfile()` in `lib/auth.ts` and shows the role in words, never as the stored
value, because the buyer is the one reading it and the column is not English. The
rows sit behind a `<Suspense>` boundary so the route still prerenders, same rule as
1.12; without it `next build` fails on uncached data.

**1.10** Not a code task, and deliberately no commit. Two `update` statements in
the Supabase dashboard, or one SQL query each, and nothing in the repo changes.
Verrel and Alfreza are both `staff`; what they sell differs, not what they can
reach. Tick the box by hand and write `manual` in place of a hash.

**1.11** The footer linked `/register`, which never gets built, so it 404ed. Now
points at `/auth/sign-up`. A test checks every nav and footer link resolves,
verified by breaking the link and watching it fail. Also dropped the empty
`supabase/client.ts` and lint ignores for files deleted in 0.8.

**1.12** The navbar read the user while rendering, so every page waited on a round
trip to Supabase Auth — including `/login` and `/auth/sign-up`, which never needed
to know. That read moved into `getClaims()` in `lib/auth.ts` behind a
`<Suspense>` boundary, deduped with React `cache()`. `proxy.ts` refreshes the
session per request. Keeps 1.7 and 1.8 in reach.

**1.13** `cacheComponents: true`. Build output went from all routes `ƒ` dynamic to
`◐` partial prerender, `/login` and `/auth/sign-up` included. Only the auth
controls are filled in per request. Depends on 1.12.

**1.14**

What: signing in no longer lands on a separate dashboard. The home page is the
storefront, login returns to it, and the one signed-in page is `/account`. Header
rebuilt after cottonink.co.id — pink announcement bar, hamburger, centred
wordmark, account/search/bag icons.
Why: a buyer signs in mid-shop and wants to keep shopping; a dashboard with
nothing on it was a dead end. Cottonink's account area is `/account`.
Tech: deleted `app/dashboard/` and `components/dashboard/`, header moved to
`components/Navbar.tsx` with `Panels.tsx` holding one-open-at-a-time state,
`login/actions.ts` redirects to `/`. Migration `0003` was required and is still
unapplied — RLS was on `profiles` with no policy at all, so no signed-in user
could read their own row. `profiles.role` is `text` while the `user_role` enum
from 1.2 goes unused; left alone then, and cleaned up by task 1.15.

**1.15** `0009_staff_role_only.sql`, a new migration rather than an edit to the
already-committed `0003`. Three statements in order: `update` the `artist` rows to
`staff`, `drop type public.user_role`, then add the `check` constraint. The order
matters — the constraint rejects an `artist` row, so it cannot be added before the
update has emptied them. Apply it in Supabase, then commit the SQL.

**1.16** The role `<select>` in `sign-up/page.tsx` loses `staff`, and
`actions.ts` narrows its allow-list to `buyer` alone. Keep the server-side check:
the client list is not a guard, a visitor can post any field they like. Being able
to sign up as `staff` is the whole bug, so the form must not offer it even though
the server would now refuse it.

**1.17** `details.tsx` drops the `artist` entries from `ROLE_LABEL` and
`ROLE_NOTE`; the account page test loses its artist case. Nothing branches on role
yet, so this is labels and tests only.

**2.4** Needs `images.remotePatterns` in `next.config.ts` first, or every image
404s through the optimiser. Storage needs its own RLS policies in a migration, and
only `staff` may write.

**6.5** The demo script and screenshots are still 6.3 and 6.4.