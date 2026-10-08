# Plan — Phase 3, tasks 3.1 and 3.2 (Titipan)

What this covers: the storage behind a titipan request, and the public page that
tells a buyer what titipan is and what it costs. Two tasks, two commits, nothing
from 3.3 onward.

Read `AGENTS.md` first, then `ROADMAP.md` — this plan only fills in the gap
between them.

---

## Where we are, and why we can start

Phase 2 has not started yet. Verrel's commissions half is untouched: no
`0004_services.sql`, no `0005_commissions.sql`, no `/commissions` page. That
means there is nothing to collide with, so both tasks can be done now.

That changes with the moment your friend begins Phase 2. Tell him before he
starts — the reservations are in **Coordination** below.

Nothing in these two tasks depends on Phase 2. `0006_titipan_requests.sql`
creates a standalone table, and `/titipan` reads no shared code. If he lands
Phase 2 halfway through this plan, neither task needs redoing.

---

## Task 3.1 — a table for titipan requests

### What it delivers

A buyer sends a Japanese product link. Staff check it, quote a price, the buyer
pays, and the request ends in a tracking number. 3.1 gives that request a row to
live in. It stores nothing a buyer can see yet — no form, no queue — but every
task from 3.4 onwards reads and writes this table, so it is first in the phase.

### The migration

`supabase/migrations/0006_titipan_requests.sql`

Every column below is named by a later task in the roadmap, which is why each one
is here and no others:

| Column | Asked for by | Notes |
|---|---|---|
| `id` | 3.4 | `uuid primary key default gen_random_uuid()` |
| `buyer_id` | 3.4, 3.5 | `uuid not null references auth.users (id) on delete cascade` |
| `product_link` | 3.3 | `text not null` — the Japanese link |
| `size` | 3.3 | `text`, nullable |
| `color` | 3.3 | `text`, nullable |
| `quantity` | 3.3 | `integer not null default 1`, `check (quantity > 0)` |
| `budget` | 3.3 | `integer`, nullable — a guess, never a commitment |
| `status` | 3.4 | `public.request_status not null default 'requested'` |
| `quote_item_price` | 3.6 | `integer`, nullable |
| `quote_shipping` | 3.6 | `integer`, nullable |
| `quote_service_fee` | 3.6 | `integer`, nullable |
| `quote_note` | 3.6 | `text`, nullable |
| `courier` | 3.11 | `text`, nullable |
| `tracking_number` | 3.11 | `text`, nullable |
| `created_at` | 3.5 | `timestamptz not null default now()` — newest first is an order by |

Decisions inside that table, and why:

- **No `total` column.** 3.6 says the total is computed automatically. Storing a
  sum next to its own three parts means two copies of one number, and the day
  staff edit a part without the total, the two disagree and the buyer is charged
  the wrong figure. `quoteTotal()` in `src/lib/quote.ts` is the single place a
  total comes from.
- **Money is `integer`.** Whole rupiah only, per `AGENTS.md`. `budget`,
  `quote_item_price`, `quote_shipping`, `quote_service_fee` all hold `15000`,
  never `15000.50`.
- **`quote_` prefix on the three money columns and the note.** Those four are the
  staff's half of the row. The prefix makes it obvious which numbers a buyer
  typed and which ones the shop filled in after the quote.
- **`status` reuses the existing enum, and this migration adds no value to it.**
  `requested` and `quoted` are all 3.1 needs — 3.4 writes `requested`, 3.7
  writes `quoted`. `accepted` and `declined` arrive with Phase 2's task 2.12, and
  `purchased`, `shipped`, `arrived` arrive at 3.10 in a migration of their own,
  exactly as the roadmap addendum requires. Widening the enum here would be
  guessing at 3.10's wording.

### Row level security

RLS on, and three policies. The table is private: a buyer sees their own requests,
staff see every request, nobody sees anything else.

```sql
alter table public.titipan_requests enable row level security;
```

```sql
-- A buyer writes their own row and nobody else's. `with check`, not `using`:
-- on an insert there is no existing row for `using` to test, so it would be
-- checked instead and a forged buyer_id would slip through.
create policy "Buyers insert their own titipan request"
  on public.titipan_requests
  for insert to authenticated
  with check (buyer_id = auth.uid());
```

```sql
create policy "Buyers read their own titipan requests"
  on public.titipan_requests
  for select to authenticated
  using (buyer_id = auth.uid());
```

```sql
create policy "Staff read every titipan request"
  on public.titipan_requests
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'staff'
    )
  );
```

**The trap in that last policy.** It has to be pinned to `p.id = auth.uid()`.
Migration `0003` gives every signed-in user a select policy on `profiles` that
allows exactly one row: their own. RLS applies to the subquery too, so a bare
`where p.role = 'staff'` reads every profile, is denied by `0003`, and staff
quietly see an empty queue — no error, just nothing. Same reasoning as
`isStaff()` in `src/proxy.ts`, which fails closed for the same reason.

**No `update` or `delete` policy in this migration.** 3.7 is the first task that
writes to a row staff do not own, and it gets its own migration. The table is
useless to staff until then, which is correct: nothing should be editable yet.

**No `grant` statements.** `0001_profiles.sql` had none and `profiles` works, so
Supabase's default privileges already cover a new table. Adding grants would be
noise.

**Every statement is written to be pasteable twice.** Nothing records which
migrations have been applied, so `create table if not exists`, and a
`drop policy if exists` before each `create policy`. Same reason `0009` is written
that way.

### Applying it — the part that has already gone wrong once

A migration in git is not an applied migration. `git push` moves SQL text; it
never runs it, and CI has no Supabase credentials. Applying is a manual step in
the dashboard, and `0003` sat unapplied for days while two symptoms were blamed
on the code.

Supabase dashboard → SQL Editor → New query. **One statement at a time.** `0003`
was pasted in a batch and aborted silently: `pg_policies` came back empty while
the statements after it in the same paste appeared to succeed.

Then check each one:

```sql
select tablename, rowsecurity from pg_tables
  where schemaname = 'public' and tablename = 'titipan_requests';
-- rowsecurity must be true
```

```sql
select policyname, cmd from pg_policies
  where tablename = 'titipan_requests' order by policyname;
-- exactly three rows: two insert/select for buyers, one select for staff
```

Shape smoke test — proves the column names and the defaults, and nothing about
the policies, because the dashboard runs as `postgres` and `postgres` ignores
RLS:

```sql
insert into public.titipan_requests (buyer_id, product_link)
  select id, 'https://example.com/item' from public.profiles limit 1;

select status, quantity, created_at from public.titipan_requests;
-- status requested, quantity 1, created_at filled in

delete from public.titipan_requests;
```

Leave the table empty. Seed data is task 6.1, and a stray row here would show up
in the 6.4 screenshots.

**Say honestly what 3.1 has not proved.** That a buyer can actually insert is not
demonstrated until the form lands at 3.4. Until then the policies are read, not
exercised.

---

## Task 3.2 — the page that explains titipan

### What it delivers

The Titipan link already exists in the hamburger, the footer and the storefront,
and all three point at nothing. This page is where they land: what a titipan is,
the four steps, and how the price is built. Signed out, on the CDN, no database
in the path.

### The page

`src/app/titipan/page.tsx`, plus `export const metadata` in the style of
`src/app/account/page.tsx`.

**No session read.** That is what lets the route prerender whole under
`cacheComponents: true`. Do not add a `getClaims()` call, and do not add a
`<Suspense>` boundary — the boundary is only needed because of the read, and
there is no read. The build prints `/titipan` as `◐`, the same as `/` and
`/staff`: that hole is the `AuthSlot` boundary in the layout, present on every
route, and not this page's doing. What matters is that `/titipan` matches them
rather than standing out, and that `npm run dev` serves it without a Supabase
call in the terminal. A session read here would undo 1.12 and 1.13 on one page.

Content, in Indonesian, matching the tone of `/account` and `/staff`:

1. **Title and one line.** "Titipan dari Jepang" — you send a product link from
   Japan, we buy it, we send it to your address in Indonesia.
2. **How it works.** The same four steps as the loop in `README.md`: you send the
   link, staff check it and quote, you accept and pay, the parcel arrives with a
   tracking number. An ordered list, so the order is in the markup and not only
   in the numbering characters.
3. **What it costs.** Four rows: item price (from your link, checked by staff),
   shipping to Indonesia (by weight and destination), service fee (flat), and the
   total, which is the three added up. Then one worked example, so "the total is
   the three added up" is not the only thing the buyer has to trust.
4. **Before you send.** Three short rules — the link has to be something that can
   still be bought and shipped, the budget is only an estimate, and a purchase
   that fails is cancelled and refunded in full. **Confirm this wording with
   Alfreza before committing.** It is policy, not decoration, and getting it wrong
   costs a real dispute.
5. **A call to action.** "Mulai titipan" → `/auth/sign-up`, plus a smaller "Sudah
   punya akun? Masuk" → `/login`. Both pages exist and both are already held by
   the nav link tests, so this ships no dead link. It is replaced by the real form
   link at 3.3. If you would rather have no button until the form exists, delete
   the block — nothing else depends on it.

### The fee is a constant in the page

```tsx
// ponytail: the standard service fee lives in this file and nowhere else. It is
// a flat amount per item, set by Alfreza; 3.6 quotes the real fee per request.
// Move it to a settings row when it needs to change without a deploy.
const SERVICE_FEE = 25000;
```

Confirm the figure with Alfreza before committing. It is one number on one line.

### The one piece of new library code

`src/lib/quote.ts`, with `quoteTotal()` summing the three parts to whole rupiah.
The page needs it for the worked example, and 3.6 needs the identical sum in the
staff quote box — one function, two callers, and a unit test with real logic
behind it (`src/lib/quote.test.ts`: three parts added, zero shipping, a stray
decimal rounded the way `formatRupiah` rounds).

Display goes through `formatRupiah` from `src/lib/format.ts`, as everywhere
else. Note that Indonesian ICU puts a non-breaking space after `Rp`, which is why
`format.test.ts` builds its expectation with `\u00a0` rather than a plain space.

### Three files that must change with it

- **`src/components/pendingPages.ts`** — drop `"/titipan"` from `PENDING`. Not
  optional: `Footer.test.tsx` has a test asserting the pending list holds no page
  that already exists, so `npm test` fails the moment `src/app/titipan/page.tsx`
  appears and this line is not changed in the same commit.
- **`src/app/titipan/page.test.tsx`** — the title, the four steps in order, the
  fee rendered as money, and the example total. Same approach as
  `src/app/page.test.tsx`: `renderToStaticMarkup`, assert on text.
- **`ROADMAP.md`** — the tick, the hash commit, and a task note.

### What 3.2 deliberately does not do

No form, no guard, no table read, no search entry, no catalogue. A static page
that explains the service, reached by links that already exist.

---

## Coordination

Both halves of this shop are two people editing the same repository, straight to
`main`, and `AGENTS.md` is explicit that neither pushes. Tell your friend this
before he starts Phase 2:

1. **`0006_titipan_requests.sql` is taken.** `0004` and `0005` are his. If 2.8's
   staff-reads-other-profiles policy or 2.4's Storage policies need a number,
   they are `0010` and up — `0007` and `0008` belong to Phase 4.
2. **`request_status` is not being widened by us.** When 2.12 adds
   `accepted` and `declined`, use `alter type ... add value if not exists`, so a
   re-paste of that migration stays harmless.
3. **Two shared files will conflict.** `src/components/pendingPages.ts` — one
   line each, he removes `/commissions`, we remove `/titipan`. `ROADMAP.md` —
   each of us ticks our own boxes and adds our own task notes. Resolve by keeping
   both; nothing is lost. `git pull` before starting and before committing.
4. **Apply migrations in number order**, `0004`, `0005`, then `0006`, in the same
   Supabase project. They do not depend on each other, but pasting out of order
   is how a migration ends up applied and unnoticed.

---

## Order of work

**3.1 first**, as the roadmap has it. It is small, and it is the thing every
later titipan task reads. Finish and commit it before opening 3.2.

1. `git pull`, then check `0006` is still free: `ls supabase/migrations`.
2. Write `0006_titipan_requests.sql`.
3. Apply it in the dashboard, one statement at a time, verify with the three
   queries above, delete the smoke-test row.
4. Tick 3.1 in `ROADMAP.md` with the note, then `npm run build`, `npm run lint`,
   `npm test`, then commit.
5. Second commit writing the hash into the box, per `AGENTS.md`.
6. Only then start 3.2: page, `quote.ts` and its test, `PENDING`, page test,
   `ROADMAP.md`. Same loop, same two commits.

### The gate, every task

- `npm run build` exits 0. This is the one that matters.
- `npm run lint` clean, `npm test` passing.
- By hand, at `npm run dev`: `/titipan` loads signed out with no console error and
  no Supabase call in the terminal. The hamburger link and the footer link both
  reach it.
- `git status` shows no `.env*`.
- Nothing pushed. Stop at "committed, ready for you to push".

---

## Commits

3.1:

```
feat(titipan): Titipan requests now have a table

What: A request for a Japanese product can be stored — link, size, colour,
quantity, budget — with room left for the quote and the tracking number.
Why: Every titipan task after this reads a row that does not exist yet.
Tech: table titipan_requests + 3 RLS policies, 0006_titipan_requests.sql
```

3.2:

```
feat(titipan): Titipan page explains the service and its cost

What: The Titipan link in the menu, footer and shop opens a real page: what a
titipan is, the four steps, and how the price is built from the item, shipping
and a flat service fee.
Why: A buyer should know what it costs before sending a link.
Tech: src/app/titipan/page.tsx, src/lib/quote.ts, PENDING list
```

Both stay inside the 30-to-50-word shape in `AGENTS.md`: plain English first, then
the detail, and never a file name in the summary line.

---

## Risks

| Risk | What happens | Answer |
|---|---|---|
| Migration written but not applied | Same as `0003`: everything looks right and nothing works | Apply in the dashboard before committing, verify with the queries above |
| Pasting in a batch | Statements abort silently | One statement at a time, verify each |
| Staff policy reads every profile | Queue is empty, no error | `p.id = auth.uid()` in the subquery |
| `PENDING` not updated | `npm test` fails on a page that exists | Same commit as the page |
| Fee number guessed | Wrong price on a live page | Confirm with Alfreza before committing |
| Friend takes `0006` | Two files, one number | Tell him now; `0006` is claimed |
| Status values widened early | Enum diverges from the roadmap | Add nothing; `requested` and `quoted` already exist |

Two traps hit while writing this, worth keeping:

- **`git checkout` undid uncommitted work.** The `PENDING` line was edited but not
  yet committed, then a mutation test put `/titipan` back and `git checkout --
  src/components/pendingPages.ts` restored the *committed* version — both entries
  back, and `Footer.test.tsx` failed for a reason that had nothing to do with the
  mutation. Re-apply the edit, or mutate a copy instead of the working tree.
- **`/commissions` answering 404 is correct**, not a regression. It is declared
  pending until Phase 2, and the pending list is exactly what makes that honest.

---

## Not in this plan

3.3 the form, 3.4 saving it, 3.5 the staff queue, 3.6 the quote box, 3.7 saving a
quote, 3.8 the buyer's list, 3.9 accept or decline, 3.10 purchased, 3.11 courier
and tracking, 3.12 arrived. Every column above was chosen because one of those
needs it, and none of them is started here.

One thing to settle later, when it bites: `request_status` is one enum for both
halves, so commission and titipan statuses accumulate in the same type. The
roadmap's answer is to widen it a phase at a time, which is what this plan
follows. If the two lifecycles ever disagree about a word, two types will be
cleaner than one.