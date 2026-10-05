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
- **Sign-up cannot grant `staff`, and never will.** There is no role field on the
  form; `signUp()` hardcodes `role: "buyer"` and never reads a role from the
  FormData, so a forged field is ignored rather than validated. Promotion is a
  manual update in Supabase. Do not add a role picker back.
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
- **`/staff` exists but is an empty shell.** Task 1.8 added the page so its guard
  could be verified by hand; 2.8 fills it with the request queue. The 0003 policy
  lets a user read only their own row, so staff reading others' profiles needs its
  own migration in 2.8.
- **A migration in git is not an applied migration.** `git push` moves SQL text;
  it never runs it. CI has no Supabase credentials and never calls
  `supabase db push`, so every migration is a manual dashboard step, and one has
  already been missed. Apply, then commit. See open items.
- **Paste migrations one statement at a time.** `0003` was pasted in a batch with
  others and aborted silently, leaving `pg_policies` empty while the later
  statements in the same paste appeared to succeed. Verify each one:
  `select policyname, qual from pg_policies where tablename = 'profiles';` for a
  policy, `to_regtype('public.user_role')` for a type.
- **Supabase Auth has an Email provider toggle, and turning it off breaks sign-in
  entirely** — for every account, not just new ones. It does not merely skip email
  confirmation. Leave it on. If sign-in suddenly fails for accounts that worked a
  minute ago, check this before suspecting the code.
- **Sign-up errors are swallowed in three places.** `login/actions.ts`,
  `auth/sign-up/actions.ts` and `lib/auth.ts` all return null or a generic message
  regardless of the real Supabase error, so a denied read, a disabled provider and a
  wrong password look identical from the page. That is why 1.8 took three wrong
  diagnoses. Log `error.message` in development before debugging one of these.
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

**Code-complete.** The only box left is 1.18, Verrel's login, which is a manual step
in the browser and Supabase. Order mattered twice on the way here: **1.16 before
1.8**, or the guard protects a route anyone can walk into, and **1.15 before 1.17**,
so the data was flipped before the labels changed.

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
- [ ] **1.18** Create Verrel's login and set the role to `staff` — manual *(SQL below)*

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

- **All five migrations are now applied.** `0003` had been written but never run
  for days, which is why `/account` showed "Belum diisi" and `/staff` bounced
  everyone. `0009` went in at the same time. Nothing records which migrations have
  been run, so this can happen again without warning.
- **Sign-up escalation: closed by 1.16.** It used to offer `staff` and only checked
  the value was in its own list. The field is gone and the role is hardcoded now, so
  task 1.8 can rely on `profiles.role` meaning something.
- **Verrel has no login.** 1.18 is the last open item in Phase 1, and it is manual.
- **Test accounts sit in the live database.** `wagakami@gmail.com` (TESTO) and
  `alamak@gmail.com` are throwaways. They will show up in the 6.4 screenshots and in
  any demo run. Delete them, or keep `alamak` as the standing buyer for guard tests
  — it is the account that proved 1.8.
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

**1.8** Verified by hand, all three cases: signed out on `/staff` gets 307 to
`/login`; signed in as Alfreza the staff page renders; signed in as a buyer it
bounces to the storefront. `proxy.ts` grew `STAFF_ROUTES` and `isStaff()`, which
reads the caller's own `profiles` row. Eleven tests in `proxy.test.ts` cover buyer
to `/`, staff through, missing row blocked, unknown role blocked, nested paths
guarded, `/staffing` left alone. Four of them were watched failing with the role
check removed before it was put back.

`app/staff/page.tsx` is a bare shell on purpose: a guard on a 404 proves nothing,
since blocked and allowed would look identical. 2.8 fills it in.

Fails closed on a missing row deliberately. Every row read null while 0003 was
unapplied, and a fail-open guard would have handed `/staff` to the public the
moment it had data behind it.

**The bug was never in this task.** `/account` said "Belum diisi" and `/staff`
bounced everyone because `0003_profiles_select_policy.sql` had never actually been
applied — RLS was on with zero policies, so every read of `profiles` was denied.
Applying it fixed both symptoms at once. Three wrong diagnoses got there first:
a stale router cache, then mismatched profile ids, then a disabled Email provider.
None of them were it. `select * from pg_policies where tablename = 'profiles'` was
the query worth running first.

**1.10** Alfreza only. `tomomiogawa764@gmail.com` is `staff`, applied by hand and
confirmed by signing in and loading `/staff`. Verrel was not promoted here because
he has no login yet; that is 1.18.

**1.18** Verrel has no account at all, so there is nothing to promote. Sign him up
through `/auth/sign-up` in the browser — that path hardcodes `buyer`, which is
exactly what we want as the starting point — then:

```sql
update public.profiles set role = 'staff' where email = 'verrel@…';
```

Confirm the address with `select id, email, full_name, role from public.profiles
order by created_at;` rather than guessing at it. Tick by hand, write `manual` in
place of a hash. No commit: nothing in the repo changes.

**1.9** Now `/account`, not `/dashboard`. Reads the `profiles` row through
`getProfile()` in `lib/auth.ts` and shows the role in words, never as the stored
value, because the buyer is the one reading it and the column is not English. The
rows sit behind a `<Suspense>` boundary so the route still prerenders, same rule as
1.12; without it `next build` fails on uncached data.

**1.10** Not a code task, and deliberately no commit. Run this in the Supabase
SQL editor after 0009:

```sql
update public.profiles set role = 'staff' where email = 'verrel@…';
update public.profiles set role = 'staff' where email = 'alfreza@…';
```

Check the address first with `select id, email, full_name, role from
public.profiles order by created_at;` — do not guess at them. Then sign in as
each one and open `/staff`. Tick by hand and write `manual` in place of a hash.

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
already-committed `0003`. Three statements, and the order is forced: the check
constraint rejects an `artist` row, so the `update` has to empty them before it can
be added. Written to be safe to paste twice — the constraint is dropped if it
exists first, because nothing tracks which migrations have been applied.

Applied and confirmed. `to_regtype('public.user_role')` now returns null, so the
enum is gone and the constraint is live.

**1.17** `details.tsx` drops the `artist` entries from `ROLE_LABEL` and
`ROLE_NOTE`, and the one staff note now speaks for both halves, since Verrel
quotes commissions and Alfreza ships titipan. The test loses its artist case and
gains one asserting no `Artist` label exists, so re-adding the role to the map would
fail. A row still holding `artist` falls back to the raw string on screen rather
than rendering blank, which is the honest reading of a value the app does not have.

**1.16** The role field is gone from the form, not merely narrowed. `page.tsx`
loses the `<select>` and its label outright; `actions.ts` stops reading `role` from
the FormData and hardcodes `role: "buyer"` into `signUp()`'s metadata. Ignoring the
posted value beats validating it: there is no code path left that could ever set a
role from client input, so the hole cannot reopen by adding a field back.

`actions.test.ts` is new and is why this could not regress unnoticed — nothing
tested `signUp()` before. Six cases: a buyer signup, a forged `staff`, a forged
`artist`, an assertion that the posted role never reaches Supabase, a mismatched
password that must not call Supabase, and a surfaced Supabase error. The forged
cases were verified by reintroducing the old `role` from FormData and watching all
three fail, then reverting.

Staff are the two of us and are promoted by hand in Supabase. There is no signup
path to staff, by design, and no invite path either.



**2.4** Needs `images.remotePatterns` in `next.config.ts` first, or every image
404s through the optimiser. Storage needs its own RLS policies in a migration, and
only `staff` may write.

**6.5** The demo script and screenshots are still 6.3 and 6.4.