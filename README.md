# Aruno Store

An online shop for two things in one place:

1. **Art commissions** — a buyer asks the artist for a custom piece. Verrel is the artist.
2. **Titipan** — a buyer sends a product link from Japan, staff buys it and ships it to Indonesia. Alfreza runs this.

Both halves follow the same four steps. They differ only in the last one: a
commission ends with a finished drawing, a titipan ends with a tracking number.

```
buyer asks  ->  staff quotes a price  ->  buyer accepts and pays  ->  staff delivers
```

## Stack

| Part | Choice |
|---|---|
| Pages | Next.js App Router, rendered on the server |
| Styling | Tailwind CSS v4 |
| Database, login, photos | Supabase (Postgres, Auth, Storage) |
| Hosting | Vercel free tier |
| Payments | Xendit, test mode |
| Language | TypeScript |
| Tests | Vitest |

## Requirements

- Node.js 24 LTS, or 22.22.2 or newer on the 22 line. Check with `node -v`.
  This is the same version Vercel runs, so what you build is what deploys.
- npm, which ships with Node.

## Install and run

```bash
npm install     # install dependencies
npm run dev     # start the dev server
```

Open <http://localhost:3000>. The page reloads as you edit files.

If the install fails oddly, run `npm cache verify` and try again. A damaged
cache is the usual cause.

## The commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload on port 3000 |
| `npm run build` | Production build. Must pass before you commit. |
| `npm start` | Serve the production build, after `npm run build` |
| `npm run lint` | ESLint over the whole repo |
| `npm test` | Vitest, single run, in a jsdom browser |

`npm run build` is the real gate. It type-checks and compiles every page.

## Project layout

Pages live in `src/app`, one folder per route. `layout.tsx` wraps every page and
imports the global stylesheet. Shared helpers sit in `src/lib`, with tests
beside them as `*.test.ts` or `*.test.tsx`.

Imports use the `@` alias, so `@/lib/format` points at `src/lib/format`.

## Tests

Vitest, in a jsdom browser. Two kinds of test:

- Logic, no DOM: `format.test.ts` tests `formatRupiah` directly.
- Components: `page.test.tsx` renders a component and queries it the way a user
  would, by role and label rather than by CSS class.

```tsx
render(<Home />);
expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
```

`cleanup` runs after every test in `vitest.setup.ts`. Without it one test's DOM
leaks into the next and the suite passes while asserting against stale markup.

Vitest cannot test `async` server components, and pages that read from Supabase
will be async. Those need an end-to-end test instead, coming with the payment
work in phase 4.

## Styling

Tailwind v4 is set up. Add classes straight in the markup:

```tsx
<h1 className="text-3xl font-semibold">Aruno Store</h1>
```

There is **no `tailwind.config.js`**. That is deliberate: v4 configures itself
from `src/app/globals.css`. Define colours and fonts there under `@theme` when
roadmap task 0.3 brings over the Aruno look.

## Environment variables

Supabase and Xendit keys live in `.env.local`, which is gitignored and must
never be committed. A `.env.example` listing the variable names lands with
roadmap task 0.5. Vercel gets the same values from its own environment
settings, never from a committed file.

If a key is ever pushed by accident, rotate it. Deleting the commit is not
enough.

## Deploying to Vercel

1. Push the repo to GitHub.
2. In Vercel, import the project. The build settings are detected automatically.
3. Add the environment variables under Project Settings, for all environments.
4. Deploy.

Vercel runs `npm run build`. It does not run the tests; GitHub Actions does
that on every push.

## Before you commit

```bash
npm run build    # must exit 0
npm run lint     # must be clean
npm test         # must pass
```

All three also run automatically in GitHub Actions on every push and pull
request to `main`.

## Working on this project

Read `AGENTS.md` first. It explains the one-task-per-session loop, the commit
message format, and the rules on secrets and pushing. `ROADMAP.md` lists the
work in order, with owners.

## Licence

See `LICENSE`.