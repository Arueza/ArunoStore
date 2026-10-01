# Aruno Store

An online shop for two things in one place:

1. **Art commissions** — a buyer asks the artist for a custom piece. Verrel is the artist.
2. **Titipan** — a buyer sends a product link from Japan, staff buys it and ships it to Indonesia. Alfreza runs this.

The platform name is **Aruno Store**. `Arueza/ArunoStore` is the GitHub remote.

Both halves share one shape, which is the main thing to understand:

```
buyer asks  →  staff quotes a price  →  buyer accepts and pays  →  staff delivers
```

They differ only in the last step. A commission ends with a finished drawing.
A titipan ends with a tracking number.

## Stack

| Part | Choice |
|---|---|
| Pages | Next.js App Router, rendered on the server |
| Database, login, photos | Supabase (Postgres, Auth, Storage) |
| Hosting | Vercel free tier |
| Payments | Xendit, test mode |
| Language | TypeScript |

## Session loop

Work in one small step at a time, then verify. This is the shape of every
session. Do not skip step 4.

1. Pick one task from `ROADMAP.md`. One task, not three.
2. Do it. Change only what that task needs.
3. Run the test loop (below).
4. Fix anything the loop caught, and run it again. Repeat until it passes.
5. Commit. Then stop and report.

Never claim something works without having run the loop yourself.

## Test loop

```bash
npm run build   # must exit 0. This is the check that matters.
npm run lint    # must be clean. Fix what it reports.
```

There is no automated test suite yet, so `build` is the real gate. Do not add
one unasked; when a task does have logic worth testing, add a single check for
it and mention it in the commit.

Then check by hand, and only for what you touched:

- The page loads at `npm run dev` with no error in the browser console.
- It works signed out. A signed-out visitor must never crash a page.
- Nothing secret is in a file you changed: `git status` should show no `.env*`.

## Git rules

**Never push.** You may stage and commit. You may not run `git push`, ever, for
any reason, including being asked to in the same sentence. Say "committed, ready
for you to push" and stop there. Verrel and Alfreza push.

**Never amend or rebase a shared commit.** New fix, new commit.

**Pull before you start.** Run `git pull` first if you have write access, since
both humans commit straight to `main`.

**Never commit secrets.** `.env*` is ignored. Supabase and Xendit keys live only
in `.env.local` and in Vercel's environment settings. If a key is ever pushed by
accident, rotate it immediately — deleting the commit is not enough.

**One migration per change.** Name them descriptively: `0007_titipan_requests.sql`,
not `add stuff.sql`. Two people working at once is the main cause of merge
conflicts here.

## Commit messages

Every commit follows this format, in **30 to 50 words total**. Concise and
straight to the point. Do not pad it.

```
type(scope): Plain English summary

What: one or two short sentences a non-programmer understands.
Why: one short sentence.
Tech: tables, pages, env vars. Keep to one line.
Refs: issue number, only if one exists.
```

`type` is one of: `feat fix docs style refactor chore test deploy`.

Real example, 50 words:

```
feat(titipan): Buyer can send a titipan request

What: Buyer fills in a form with a product link, size, colour and budget,
then submits. The request appears in the staff queue.
Why: Staff must quote the real price from Japan before anything is bought.
Tech: table titipan_requests + RLS policy, app/titipan/request/page.tsx
```

Keep the summary line short and in plain English. Never write
`feat(app/titipan/request/page.tsx): add form`. The reader wants to know what
changed for a person, not which file changed.

Plain English first, then the technical detail. Same rule for this file, for
plans, and for anything else written for a person.

## Coding rules

**Store money as whole rupiah.** `15000`, never `15000.50`. Decimals in a
database cause rounding bugs. Format for display at the very last moment.

**Simplify before you add.** Reuse what exists, delete what is unused, and skip
anything no task has asked for. Unrequested abstraction is the main way this
project wastes time.

**Comment the non-obvious only.** No comment that restates the line below it.
Mark a deliberate shortcut with `ponytail:` naming the ceiling and the way to
upgrade it later.

## Before you finish

- [ ] Test loop passes: `build` exits 0, `lint` is clean
- [ ] The touched pages work signed out and do not crash
- [ ] `git status` shows no `.env*` and no other secret
- [ ] Commit is 30 to 50 words and follows the format
- [ ] The matching `ROADMAP.md` box is ticked
- [ ] Nothing was pushed

## Work plan

The step-by-step to-do list with owners is in `ROADMAP.md`. Read it before
starting. Tick a task only after the loop passes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
