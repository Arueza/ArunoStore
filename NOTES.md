# Aruno Store — notes

Too heavy for `ROADMAP.md`: traps, unfixed defects, decisions that still bind.
One trap per line. **Hard cap: 150 lines**, checked by `ROADMAP.test.ts`.

## Migrations

- **Number with `000N_name.sql`.** `0001`–`0027` are taken (`0009` a deliberate gap, `0016` repairs P1's policies, `0017` artwork storage, `0018` staff update policy, `0019` staff reads profiles, `0020` buyer accepts/declines, `0021` delivery image bucket, `0022` titipan staff quote, `0023` commissions quote trigger, `0024` seed data, `0025` admins→profiles migration, `0026` drop admins table, `0027` corrected reseed, `0028` titipan buyer accept/decline policy, `0029` titipan purchased status, `0030` titipan shipped status + courier grant, `0031` titipan arrived status, `0032` shop-images bucket + non-negative stock check); `0033` next free. Supabase's own files (`20261004133000_…`) share the directory, not the count.
- **Check the number is free before writing one.** `0017` was issued twice (2.4 storage, then 2.8 staff reads, renamed `0019`) and only git noticed: the SQL editor never sees a filename, so a duplicate applies cleanly then disagrees with the repo.
- **Paste one statement at a time.** `0003` went in as a batch and aborted silently. Verify after: `select policyname, qual from pg_policies where tablename = 'profiles';`
- **`drop policy if exists "name"` can silently do nothing.** Read names as hex
  first: `encode(convert_to(polname,'utf8'),'hex')`.
- **Never read table shape from the dashboard schema export.** It omitted four
  FKs and every `on delete`. Use `pg_constraint` / `pg_trigger`; event triggers
  live in `pg_event_trigger`.
- **The connected GitHub↔Supabase integration does nothing.** No
  `supabase/config.toml`. To make it work: backfill
  `supabase_migrations.schema_migrations` by hand and renumber the two
  Supabase-era files (`0010` sorts before `20261004150000` as strings).
- **P1's files are captured, not authored** (`0010`–`0015`; no creation SQL ever existed). Functions and triggers live in `0015` — paste it last, the trigger needs the function — each preceded by `drop ... if exists` because triggers have no `if not exists`. `update_updated_at()` serves four tables. `ensure_rls`, an event trigger, puts RLS on all seventeen tables and is invisible to `pg_trigger` queries.

## RLS and policies

- **RLS on with no policy denies every row, silently.** `0003` sat unapplied for
  days — `getProfile()` returned null, `/account` said "Belum diisi", no error
  anywhere. A policy on a table whose RLS is *off* is inert. Check both.
- **A policy may never name its own table.** `exists (select 1 from profiles p
  where …)` written on `profiles` re-evaluates itself: `infinite recursion
  detected in policy for relation "profiles"`. `0005` uses the identical
  subquery safely because its policy sits on `commissions`. Fix: `is_staff()`.
- **`is_staff()` is load-bearing as written.** SECURITY DEFINER (inner read runs as owner, skips RLS); `language plpgsql`, because a `language sql` body is inlined by the planner and the recursion returns; and it reads `auth.uid()` itself, because an argument would let a buyer ask "is this uid staff" about anyone, get `true`, and read every profile.
- **Columns are not rows, so RLS cannot express them.** `0018` revokes UPDATE on
  `commissions` from `authenticated`, then re-grants exactly `quote_price,
  quote_note, status`. Without it a staff session holding the anon key could
  rewrite `buyer_id` and hand one buyer's request to another account.
- **Verify the grant landed.** The `information_schema.column_privileges` query at the foot of `0018` catches a revoke that silently did nothing: three columns was correct before 0021, four after it. `delivery_image` was added by `0021`.
- **A column grant is not a role.** `0022`'s trigger puts the four `quote_*` columns back the way it found them on any update where `is_staff()` is false, because 3.9's buyer policy otherwise reopens the very grant the trigger is guarding — a buyer could quote themselves Rp 7.000 instead of Rp 700.000. `0023` applies the same trigger to `commissions`, pinning `quote_price` and `quote_note`.
- **Read the reused clause before relying on it.** No `with check` means
  Postgres reuses `using`. On `0018` that is exactly what is wanted; on
  `admins` it is too weak and an admin can update their own `store_role`.
- **Every admin policy hangs off one row of `admins`,** whose only select policy
  is `auth.uid() = id`. Tighten or drop it and all thirteen go false at once —
  no error, just empty tables.
- **Staff policies pin to `p.id = auth.uid()`.** A bare `where p.role='staff'`
  reads every profile, `0003` denies that read, and the queue renders empty
  with no error to explain it.

## Roles, auth, routes

- **Two roles: `buyer` and `staff`.** Artist is not a role — `0002` created the
  enum, `0009` dropped it. Verrel and Alfreza are both `staff`.
- **Sign-up cannot grant `staff`.** `signUp()` hardcodes `role: "buyer"` and
  never reads role from FormData; promotion is manual in Supabase (1.16).
- **Render with `getClaims()`, never `getUser()`.** The first is wrapped in
  React `cache()` and verifies locally; the second hits the Auth server, so it
  is for Server Actions and Route Handlers only.
- **Next 16 renamed `middleware.ts` to `src/proxy.ts`.** The guard is `SIGNED_IN_ROUTES` plus `STAFF_ROUTES` / `isStaff()`, and fails closed on a missing profile row — fail-open would hand `/staff` to the public. Public prefixes stay open deliberately: `/commissions/request` is in the array, `/commissions` is not.
- **Signup route is `/auth/sign-up`,** not `/register`. Sign-up errors are
  swallowed in three places (`login/actions.ts`, `auth/sign-up/actions.ts`,
  `lib/auth.ts`) — log `error.message` in development.
- **Supabase Auth's Email provider toggle stays on.** Turning it off breaks
  sign-in for every account.
- **Logins:** Verrel and Alfreza are `staff`. Test accounts in the live DB:
  `wagakami@gmail.com` (TESTO) and `alamak@gmail.com` — keep `alamak` as the
  standing buyer for guard tests. No password is recorded in this repo.

## Build and rendering

- **`cacheComponents: true` is on.** A session read behind a page needs
  `<Suspense>` or `next build` fails on uncached data. `params` and
  `searchParams` must be awaited *inside* the boundary's children, never in the
  page body — and `searchParams` needs its own boundary, being a request read.
- **Prerender by reading nothing session-shaped.** `/artworks`, `/titipan`,
  `/titipan/request` and `/shop` read no cookie at all, so they build with no
  `<Suspense>`; `/artworks` and `/shop` additionally go through
  `createPublicClient()` (`src/lib/supabase/public.ts`, cookie-less) behind
  `'use cache'`. The titipan pair reads nothing, so they need neither.
- **Vitest cannot render a `'use cache'` component.** `renderToStaticMarkup`,
  `renderToString` and `renderToPipeableStream` all fail — 2.5's only proof is
  that build and lint pass.
- **`0004_services.sql` has no write policy on purpose:** 5.6 adds staff CRUD.
  Until then `services` is seeded by hand, so the populated service dropdown
  at 2.6 has never rendered in a browser, and the insert against `0005`'s
  policy is unproven end to end — `actions.test.ts` asserts the row the action
  builds, not that RLS accepted it. 3.4 is in the same place: the titipan insert
  has never met a real database, and `titipan_requests` cannot be updated by
  anyone until `0022` is pasted into the SQL editor, which nothing here records.
- **A query string value will appear in the HTML, and that is not your code rendering it.** Next echoes the whole URL into the RSC flight payload (`self.__next_f.push`), JSON-escaped, on any page that reads `searchParams`. So `?next=//evil.example` shows up in the source of a page that never renders it — check *where* before treating it as a hole.
- **A glob or grep will not find `[id]`.** Brackets are a character class, so `src/**/*.{ts,tsx}` matches a file named `i` or `d` and silently skips every dynamic route. `git status` is what shows them; trust the diff, not the search.
- **Nothing signed in has been seen against real rows.** 2.8–2.11 shipped as one
  commit (`c34914b`), proved only signed-out (queue, quote box and buyer list
  all 307 to `/login`) plus 104 tests. 6.2 is where that gets signed off.

## Data and money

- **`saveQuote` refuses any price that is not `^\d+$`.** `parseInt("15000.50")` is 15000 and the column's `check (quote_price >= 0)` never sees the dropped decimals. `status` is set by the action, not the form, so a forged field cannot un-quote a request staff already priced. Price `0` is a real answer and is accepted; blank is not. Blank `quote_note` stores `null`, not `""`.
- **`request_status` holds `requested | quoted | accepted | declined`.** 0020
  widened it; a decline is final, an accept is irreversible from the buyer side.
  3.9 and 4.x may add more. Widen in its own migration, one phase at a time.
- **There is no `total` column.** `quoteTotal()` in `src/lib/quote.ts` is the
  only source (`SERVICE_FEE = 25000`, marked `ponytail:`).
- **`statusLabel()` in `src/lib/commissionStatus.ts` is shared** by the staff
  queue, the buyer list, and the staff detail page so the three cannot call one
  state two ways. An unknown value falls through to itself — visible but wrong
  beats a blank cell that reads as a bug.
- **Delivery images use signed URLs, not public ones.** The `commission-deliveries`
  bucket is private (0021); the server generates a signed URL after the RLS-gated
  commission read confirms the buyer owns the row. `next/image` would cache past
  expiry, so both pages use `<img>` with an eslint-disable.
- **Display webp, keep originals.** Gallery and shop render through `next/image`,
  which serves webp/avif per browser; delivery `<img>` stays plain until an
  optimized derivative exists. Never resize the stored original — a full-size view
  or download reads the original path, so a downscaled display copy must not
  replace it.
- **`formatDate()` in `src/lib/format.ts` is pinned to UTC by the `timeZone`
  option, and a test caught it missing.** Without it `2026-10-09T23:30:00Z`
  renders as the 10th here and the 9th on any UTC server. Switch to
  `Asia/Jakarta` if staff and a buyer ever disagree about which day.
- **The `.eq("buyer_id", claims.sub)` on `/commissions/mine` and `/titipan/mine` deliberately duplicates 0005's and 0006's policies.** If either policy were dropped or misspelled, RLS alone would hand one buyer every request in the table and nothing would look wrong; with it the worst case is an empty list.
- **Both staff queues join in JavaScript, not in a PostgREST embed** — `commissions.buyer_id` and `titipan_requests.buyer_id` both reference `auth.users`, not `profiles`, so there is no FK to follow. Save feedback is the query string (`?saved=1` / `?error=…`) set by the server redirect: no client component that could disagree.
- **2.6 and 3.3 both refuse anything but http/https, through one function.**
  `isHttpUrl()` in `src/lib/url.ts` — not two copies of a security rule. Both
  columns are rendered as an `href` by staff (0005's `reference_links`, 0006's
  `product_link`), so a stored `javascript:` link runs in a staff session. Blank
  link rows are dropped, not an error.
- **Form tests: `fireEvent`, never `user-event`, and `fireEvent.submit(form)`.**
  React 19 runs a form action off the submit event and jsdom's button click never
  dispatches one, so the action is silently never called. `toHaveTextContent`
  also normalises U+00A0 to a plain space, so a pattern carrying ICU's
  non-breaking space after `Rp` never matches — assert on `.textContent`.

## Known defects — not yet tasks

- **`handle_commission_order_confirmed()` is broken.** It updates `commissions`
  columns `used_slots` / `max_slots`, which do not exist, and sets
  `status='closed'`, which is not in `request_status`; the AFTER UPDATE trigger
  rolls the whole thing back. Blocked on the overlap decision.
- **Commission orders cannot be inserted.** `notify_commission_order()` looks up `where store_role='art_commission' limit 1` and the column defaults to `'consignment'`; a null address then violates `email_notifications.recipient_email not null` and takes the order insert with it.
- **Overlap: `commission_orders` / `commission_categories` do the work of `commissions` / `services`.** P1 captured both; choosing one is still undecided. Their money columns are `numeric`, against the whole-rupee rule, and `admins.store_role` still allows the three-role model Phase 1 deleted.
- **`consignment_items.stock` can go negative** — no `check (stock >= 0)`, and
  `handle_consignment_order_confirmed()` decrements it.
- **A confirmed consignment item never returns to `'tersedia'`.**
- **No index on any FK, status or `created_at`.** The staff queue's "newest
  first" is a sequential scan until one exists.
- **Nothing measured since 1.12 / 1.13.** No Lighthouse run against the live
  site, and whether Supabase and Vercel functions share a region is unknown.
  Measure both after the next deploy.
- **`admins` table dropped.** 0025 migrated `consignment_items.admin_id` to
  `profiles(id)`, replaced all admin policies with `is_staff()`, and rewrote
  notify functions to read from `profiles`. 0026 dropped the table entirely.
