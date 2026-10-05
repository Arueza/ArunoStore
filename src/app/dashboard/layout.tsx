import { Suspense } from "react";
import DashboardChrome from "@/components/dashboard/DashboardChrome";

/**
 * Layout for every /dashboard page.
 *
 * Never awaits. Reading the session here would hold the whole segment behind
 * Supabase and stop the page prerendering, so the read sits in DashboardChrome
 * behind a boundary — the same shape Navbar uses for AuthSlot.
 *
 * The guard lives in src/proxy.ts, not here: the proxy runs before rendering,
 * so a signed-out visitor is redirected before this layout is reached.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-cream text-ink">
      <Suspense fallback={<ChromeFallback />}>
        <DashboardChrome />
      </Suspense>
      <main className="flex-1">{children}</main>
    </div>
  );
}

// Holds the navbar's height so the page does not jump when the session
// resolves. Shows no links, because flashing a signed-out control at someone
// who is already signed in is worse than a small layout shift.
function ChromeFallback() {
  return <div aria-hidden="true" className="h-[6.5rem] border-b border-[#eeeae5]" />;
}