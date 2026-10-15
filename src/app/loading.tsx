/**
 * Static skeleton for route transitions (roadmap 5.22).
 *
 * Reads nothing session-shaped, so it prerenders with no Suspense boundary
 * and never trips the cacheComponents request-read rule. The top progress
 * bar (RouteFeedback) covers navigations; this covers the slower segments
 * that stream in after it.
 */
export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-[6%] sm:py-20"
    >
      <span role="status" className="sr-only">
        Memuat…
      </span>
      <div aria-hidden="true" className="animate-pulse space-y-4">
        <div className="h-8 w-2/3 rounded bg-[#eeeae5]" />
        <div className="h-4 w-full rounded bg-[#eeeae5]" />
        <div className="h-4 w-5/6 rounded bg-[#eeeae5]" />
        <div className="h-40 w-full rounded bg-[#eeeae5]" />
      </div>
    </main>
  );
}
