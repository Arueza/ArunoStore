# Aruno Store — work plan

Tick a box only after the task actually works. One commit per task.

Owners: **V** = Verrel (commissions) · **A** = Alfreza (titipan) · **V+A** = shared

---

## Phase 0 — Running and online

Nothing else can be tested until the project runs and is on the internet.

- [x] **0.1** `.gitignore` exists before any `npm install` — **V+A**
- [x] **0.2** Create the Next.js app in this repo (`create-next-app`, TypeScript,
      no Tailwind, App Router) — **V+A**
      *(Done by hand, not `create-next-app`. App Router + TypeScript, and
      Tailwind v4 added early by choice — no `tailwind.config.js`, theme lives
      in `globals.css`.)*
- [ ] **0.3** Copy the Artora look: colours `#fbfaf8` / `#a45d79` / `#1d1b20`,
      fonts DM Sans + Playfair Display — **V+A**
- [ ] **0.4** Shared navbar and footer built as components — **V+A**
- [ ] **0.5** Create the Supabase project and note the URL and anon key — **V+A**
- [ ] **0.6** Put the URL and anon key in `.env.local`, confirm `.env.local` is
      ignored by `git status` — **V+A**
- [ ] **0.7** Deploy to Vercel, confirm the site loads online — **V+A**
- [ ] **0.8** Delete the three Artora HTML files and `css/`, `js/` — **V+A**

## Phase 1 — Shared foundation

Login, the database, and the shared layout. Both halves need all of this.

- [ ] **1.1** Migration `0001_profiles.sql`: `id`, `email`, `full_name`, `role`,
      `created_at` — **V+A**
- [ ] **1.2** Migration `0002_enums.sql`: roles `buyer | artist | staff`,
      and the shared status list — **V+A**
- [ ] **1.3** Turn on row level security on every table — **V+A**
- [ ] **1.4** Sign-up page, role chosen at sign-up — **V+A**
- [ ] **1.5** Log in and log out — **V+A**
- [ ] **1.6** Read the signed-in user in a server component — **V+A**
- [ ] **1.7** Protect `/dashboard` so only signed-in users reach it — **V+A**
- [ ] **1.8** Protect `/staff` so only `artist` and `staff` reach it — **V+A**
- [ ] **1.9** `/dashboard` shows the user's name and role — **V+A**
- [ ] **1.10** Promote Verrel to `artist` and Alfreza to `staff` by editing the
      row in Supabase — **V+A**

## Phase 2 — Commissions (Verrel's half)

The artist quotes a price for custom work, buyer accepts and pays.

- [ ] **2.1** Migration `0003_services.sql`: what is offered, starting price,
      duration, active flag — **V**
- [ ] **2.2** Migration `0004_commissions.sql`: buyer, service, brief, reference
      links, quote, status, delivery image — **V**
- [ ] **2.3** Public page listing the services — **V**
- [ ] **2.4** Artwork gallery from Supabase Storage, upload only for `artist` — **V**
- [ ] **2.5** Artwork gallery page — **V**
- [ ] **2.6** Request form: pick a service, write the brief, add reference links — **V**
- [ ] **2.7** Save the form as a row with status `requested` — **V**
- [ ] **2.8** Staff list of all requests, newest first — **V**
- [ ] **2.9** Staff view of one request with a quote box: price and note — **V**
- [ ] **2.10** Saving the quote sets status `quoted` — **V**
- [ ] **2.11** Buyer's "my commissions" list with current status — **V**
- [ ] **2.12** Accept or decline a quote from the buyer side — **V**
- [ ] **2.13** Upload the finished drawing, visible to that buyer only — **V**
- [ ] **2.14** Status labels in plain language, not `in_progress` — **V**

## Phase 3 — Titipan (Alfreza's half)

Buyer sends a Japanese product link, staff quotes price + shipping + fee.

- [ ] **3.1** Migration `0005_titipan_requests.sql`: link, size, colour, budget,
      quote split, tracking — **A**
- [ ] **3.2** Explain the service on the page: what a titipan is, what it costs — **A**
- [ ] **3.3** Request form: product link, size, colour, quantity, budget — **A**
- [ ] **3.4** Save the form as a row with status `requested` — **A**
- [ ] **3.5** Staff queue of all requests, newest first — **A**
- [ ] **3.6** Quote box: item price, shipping, service fee, total computed
      automatically, plus a note — **A**
- [ ] **3.7** Save the quote, status becomes `quoted` — **A**
- [ ] **3.8** Buyer's "my titipan requests" list — **A**
- [ ] **3.9** Accept or decline a quote — **A**
- [ ] **3.10** Mark as purchased — **A**
- [ ] **3.11** Add courier and tracking number, status becomes `shipped` — **A**
- [ ] **3.12** Buyer marks it arrived — **A**

## Phase 4 — Payments (Xendit test mode)

Do this after both halves can reach "buyer accepts a quote", otherwise there is
nothing to pay for.

- [ ] **4.1** Create the Xendit account, switch to test mode — **V+A**
- [ ] **4.2** Put the test secret key in `.env.local` and Vercel — **V+A**
- [ ] **4.3** Migration `0006_payments.sql`: order, amount, status, Xendit ids — **V+A**
- [ ] **4.4** Migration `0007_order_statuses.sql` — **V+A**
- [ ] **4.5** Server code that creates an invoice for an accepted quote — **V+A**
- [ ] **4.6** Checkout page that shows the amount and opens the payment — **V+A**
- [ ] **4.7** Webhook that marks the payment paid — **V+A**
- [ ] **4.8** Marking paid also moves the order forward to `paid` — **V+A**
- [ ] **4.9** Pay once with a fake card, confirm it works end to end — **V+A**
- [ ] **4.10** A "payment failed" path that does not advance the order — **V+A**

## Phase 5 — Nice to have, only if time allows

- [ ] **5.1** Staff overview: counts of open requests per status — **V+A**
- [ ] **5.2** Search and filter on both lists — **V+A**
- [ ] **5.3** Buyer leaves a rating after delivery — **V+A**
- [ ] **5.4** Curated titipan catalogue: staff list popular items, buyer adds to
      basket directly without waiting for a quote — **A**

## Phase 6 — Submission

- [ ] **6.1** Seed data: a few services, artworks, sample requests — **V+A**
- [ ] **6.2** Test the whole flow once more on the live site, signed out — **V+A**
- [ ] **6.3** Write the demo script: what to click, in order — **V+A**
- [ ] **6.4** Screenshots of every page — **V+A**
- [ ] **6.5** Rewrite `README.md`: what it is, how to run, how to test — **V+A**
- [ ] **6.6** Check nothing secret is in the repository — **V+A**
- [ ] **6.7** Custom domain, if time allows — **V+A**

---

## Cut list, if we run out of time

Drop in this order, and do not drop them silently — say so in the final write-up.

1. Phase 5, all of it.
2. Task 3.12 and 6.7.
3. Task 5.3 in phase 5 (already covered by the first cut).
4. Gallery uploads — use a link to an image instead.

Never cut: payment, login, or the quote step. They are the assignment.
