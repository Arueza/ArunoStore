import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie once per request.
 *
 * Without this, nothing renews a session on navigation: `setAll` in
 * src/lib/supabase/server.ts can only fire from a Server Action, and it
 * swallows the write when called from a Server Component. Roadmaps 1.7 and 1.8
 * also put route protection here.
 *
 * Note the filename. Next.js 16 renamed `middleware.ts` to `proxy.ts`;
 * `middleware.ts` is deprecated in this version.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Renews the access token when it is near expiry. Reads the cookie when there
  // is nothing to renew, so a signed-out visitor costs no network call.
  await supabase.auth.getSession();

  return response;
}

export const config = {
  // Skips static files, the image optimiser and the favicon. Without this the
  // proxy runs on every asset request too, which needlessly delays them.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};