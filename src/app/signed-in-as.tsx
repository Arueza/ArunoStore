import { getClaims } from "@/lib/auth";

/**
 * Names the signed-in visitor. Rendered behind a <Suspense> boundary by the
 * home page, and kept in its own file so a test can await it directly: React's
 * client renderer cannot render an async Server Component.
 */
export default async function SignedInAs() {
  const user = await getClaims();

  if (!user) return null;

  return (
    <p className="mt-2 text-sm text-gray-600">Signed in as {user.email}</p>
  );
}