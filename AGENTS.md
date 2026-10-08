# Aruno Store

Two businesses in one shop. **Commissions** — a buyer asks the artist for a
custom piece; Verrel is the artist. **Titipan** — a buyer sends a product link
from Japan, staff buys it and ships it to Indonesia; Alfreza runs this. Remote
is `Arueza/ArunoStore`.

Both halves run the same loop, and differ only at the end:

    buyer asks → staff quotes → buyer pays → staff delivers

A commission ends in a finished drawing. A titipan ends in a tracking number.

Next.js App Router, server-rendered, TypeScript. Supabase for database, login
and photos. Xendit in test mode for payments. Vercel free tier to host.

## Every session

Take the next task from `ROADMAP.md` and finish it before starting the next.
More than one task per session is fine, as long as each one is finished and
checked on its own first. Change only what the task in hand needs. For each
task:

1. `npm run build` exits 0. This is the gate that matters.
2. `npm run lint` is clean. `npm test` passes. Add no framework, and no test
   with no logic behind it, unless asked.
3. Fix whatever the loop caught and run it again. Repeat until it passes.
4. By hand, and only for what you touched: the page loads at `npm run dev`
   with no console error, it works signed out, and `git status` shows no
   `.env*`.
5. Commit. If you ticked a `ROADMAP.md` box, make one more commit that writes
   this commit's hash into it — a commit cannot contain its own hash.

Report when the session's tasks are done.

Never claim something works without running the loop yourself. Tick a box only
after the loop passes.

`assets/` is a staging folder for raw media — logos, images — kept before they
are imported properly into `src/`. It stands on its own. Nothing reads it; do
not delete it as cleanup.

Before you finish:

- [ ] Nothing was pushed
- [ ] `git status` shows no `.env*` and no other secret
- [ ] A ticked `ROADMAP.md` box has its hash commit

## Git

Never `git push`, ever, for any reason, including when asked in the same
sentence. Stop at "committed, ready for you to push". Verrel and Alfreza push.

Never amend or rebase a shared commit. Pull first if you have write access:
both humans commit straight to `main`.

Never commit secrets. `.env*` is ignored; Supabase and Xendit keys live only in
`.env.local` and Vercel's settings. A key pushed by accident gets rotated —
deleting the commit is not enough.

One migration per change, named descriptively: `0007_titipan_requests.sql`,
not `add stuff.sql`. Two people working at once is the main cause of merge
conflicts here.

Every migration is pasted into the Supabase SQL editor by hand. No push applies
one, and CI never will. Write each one re-runnable anyway — `create table if not
exists`, `drop policy if exists` before each policy — and paste the query that
proves it landed in the same message, so the next person does not inherit a
migration nobody ran. `0003` sat unapplied for days and every read of `profiles`
was silently denied while nothing reported a permission error.

One Supabase project, two people's tables. `admins`, `users`, `consignment_*`,
`commission_categories`, `commission_images`, `commission_orders`,
`commission_order_references`, `consignors` and `email_notifications` are
Alfreza's work on Phase 3, not ours and not ours to drop. Ours is `profiles`,
`services`, `commissions`, `titipan_requests`. Read `ROADMAP.md` before touching
either side — the two sets overlap and one decision is still open.

## Commit messages

30 to 50 words total. This shape:

    type(scope): Plain English summary

    What: one or two sentences a non-programmer understands.
    Why: one short sentence.
    Tech: tables, pages, env vars. One line.
    Refs: issue number, only if one exists.

`type` is one of `feat fix docs style refactor chore test deploy`.

Real example, 50 words:

    feat(titipan): Buyer can send a titipan request

    What: Buyer fills in a form with a product link, size, colour and budget,
    then submits. The request appears in the staff queue.
    Why: Staff must quote the real price from Japan before anything is bought.
    Tech: table titipan_requests + RLS policy, app/titipan/request/page.tsx

The summary line says what changed for a person, never which file changed.
Plain English first, then the detail — same rule for this file and for plans.

## Code

Money is whole rupiah: `15000`, never `15000.50`. Decimals in a database cause
rounding bugs. Format for display at the last moment.

Simplify before you add. Reuse what exists, delete what is unused, skip
anything no task has asked for. Unrequested abstraction is how this project
wastes time.

Comment the non-obvious only. Mark a deliberate shortcut with `ponytail:`,
naming the ceiling and how to upgrade later.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
