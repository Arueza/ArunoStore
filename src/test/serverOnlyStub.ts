// Stands in for the `server-only` package, which Next.js resolves through its
// own bundler alias. Vitest runs through Vite, which does not know that alias,
// so without this stub every import of `server-only` fails to resolve.
// The real package throws if it is ever pulled into a client bundle; the tests
// here build no client bundle, so an empty module is enough.
export {};