# Aruno Store — work plan

Tick a box only after the task actually works. One commit per task. The commit
that finishes a task is followed by one more commit that writes its hash into the
ticked box.

---

## Phase 0 — Running and online

Nothing else can be tested until the project runs and is on the internet.

- [x] **0.1** `.gitignore` exists before any `npm install`
      *(`199ecaa`)*
- [x] **0.2** Create the Next.js app in this repo (`create-next-app`, TypeScript,
      no Tailwind, App Router)
      *(Done by hand, not `create-next-app`. App Router + TypeScript, and
      Tailwind v4 added early by choice — no `tailwind.config.js`, theme lives
      in `globals.css`. Commit `199ecaa`.)*
- [x] **0.3** Copy the Artora look: colours `#fbfaf8` / `#a45d79` / `#1d1b20`,
      fonts DM Sans + Playfair Display
      *(Cream, plum and ink as `cream`/`plum`/`ink`. Both fonts self-hosted via
      `next/font/google` as CSS variables; `font-display` for Playfair. Commit
      `12fc166`.)*
- [x] **0.4** Shared navbar and footer built as components
      *(`20b9af2`)*
- [x] **0.5** Create the Supabase project and note the URL and anon key
      *(Project already existed under the partner's org; no second project
      made. Noted Project URL and the new-format `sb_publishable_` key, not the
      secret key. `sb_publishable_` is opaque, not a JWT, so it cannot reach
      `/rest/v1/` root — that endpoint is schema and is locked to secret keys.
      Verified with `/auth/v1/settings`, 200.)*
- [x] **0.6** Put the URL and anon key in `.env.local`, confirm `.env.local` is
      ignored by `git status`
      *(`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
      `git status --ignored` shows `.env.local` as `!!`. Added `.env.example`
      with the two names and no values. Commit `4da4914`.)*
- [x] **0.7** Deploy to Vercel, confirm the site loads online
      *(https://aruno-store.vercel.app — HTTP 200, no login wall. Production
      CSS carries `.bg-cream` `#fbfaf8` and `.bg-ink` `#1d1b20`. Serving
      `fe78ad0`, matching local `HEAD`. Both env vars set in Vercel as
      Production and Preview, but **not yet provable**: no JS chunk contains
      `sb_publishable_` because `src/` reads no Supabase value. Verified once
      1.4 adds a client. Navbar 404s on `/commissions`, `/titipan`, `/login`,
      `/register` — those routes land in Phase 1. Commit `05438b4`.)*
- [x] **0.8** Delete the three Artora HTML files and `css/`, `js/`
      *(`index.html`, `login.html`, `register.html`, `css/style.css`,
      `js/script.js`. `assets/` kept — raw media staging, nothing reads it.
      Build output still lists only `/`, `/_not-found`, `/icon.png`.
      Commit `4962955`.)*

## Phase 1 — Shared foundation

Login, the database, and the shared layout. Both halves need all of this.

- [ ] **1.1** Migration `0001_profiles.sql`: `id`, `email`, `full_name`, `role`,
      `created_at` *(`0344c42`)*
- [ ] **1.2** Migration `0002_enums.sql`: roles `buyer | artist | staff`,
      and the shared status list
- [ ] **1.3** Turn on row level security on every table
- [ ] **1.4** Sign-up page, role chosen at sign-up
- [ ] **1.5** Log in and log out
- [ ] **1.6** Read the signed-in user in a server component
- [ ] **1.7** Protect `/dashboard` so only signed-in users reach it
- [ ] **1.8** Protect `/staff` so only `artist` and `staff` reach it
- [ ] **1.9** `/dashboard` shows the user's name and role
- [ ] **1.10** Promote Verrel to `artist` and Alfreza to `staff` by editing the
      row in Supabase

## Phase 2 — Commissions (Verrel's half)

The artist quotes a price for custom work, buyer accepts and pays.

- [ ] **2.1** Migration `0003_services.sql`: what is offered, starting price,
      duration, active flag
- [ ] **2.2** Migration `0004_commissions.sql`: buyer, service, brief, reference
      links, quote, status, delivery image
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

- [ ] **3.1** Migration `0005_titipan_requests.sql`: link, size, colour, budget,
      quote split, tracking
- [ ] **3.2** Explain the service on the page: what a titipan is, what it costs
- [ ] **3.3** Request form: product link, size, colour, quantity, budget
- [ ] **3.4** Save the form as a row with status `requested`
- [ ] **3.5** Staff queue of all requests, newest first
- [ ] **3.6** Quote box: item price, shipping, service fee, total computed
      automatically, plus a note
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
- [ ] **4.3** Migration `0006_payments.sql`: order, amount, status, Xendit ids
- [ ] **4.4** Migration `0007_order_statuses.sql`
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
- [ ] **5.4** Curated titipan catalogue: staff list popular items, buyer adds to
      basket directly without waiting for a quote

## Phase 6 — Submission

- [ ] **6.1** Seed data: a few services, artworks, sample requests
- [ ] **6.2** Test the whole flow once more on the live site, signed out
- [ ] **6.3** Write the demo script: what to click, in order
- [ ] **6.4** Screenshots of every page
- [x] **6.5** Rewrite `README.md`: what it is, how to run, how to test
      *(Install, run, commands, layout, Tailwind notes, env vars, Vercel. The
      demo script and screenshots are still 6.3 and 6.4. Commit `9b6dddb`.)*
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
