import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Aruno Store</h1>
        {user && (
          <p className="mt-2 text-sm text-gray-600">
            Signed in as {user.email}
          </p>
        )}
      </div>
    </main>
  );
}