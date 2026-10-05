import { getClaims } from "@/lib/auth";
import DashboardNavbar from "./DashboardNavbar";

/**
 * The signed-in header for every /dashboard page.
 *
 * Lives in its own file, behind a <Suspense> boundary in the layout, for the
 * same reason AuthSlot does: awaiting the session while rendering the layout
 * would put a Supabase round trip in front of every dashboard page. A test can
 * await this component directly, which React's client renderer cannot do for an
 * async Server Component.
 *
 * getClaims() carries `email` but neither the profile's full name nor the app's
 * buyer/artist/staff role. Task 1.9 reads both from the profiles table; until
 * then the greeting falls back to the email.
 */
export default async function DashboardChrome() {
  const claims = await getClaims();

  return <DashboardNavbar userName="" userEmail={claims?.email ?? ""} />;
}