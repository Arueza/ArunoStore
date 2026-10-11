"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/nextPath";

export type LoginState = {
  message: string;
};

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return { message: "Data login tidak valid." };
  }

  if (!email.trim() || !password) {
    return { message: "Email dan password wajib diisi." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return { message: "Email atau password salah." };
  }

  // Where they meant to go, if the proxy remembered. safeNextPath() decides, not
  // this function: the value is whatever arrived in the query string and then in
  // a hidden field, so treating it as a path would let a crafted link walk
  // somebody off the site, or into /staff, the moment they signed in.
  const destination = safeNextPath(formData.get("next"));

  // Back to the storefront, not a separate dashboard: signing in is something a
  // buyer does mid-shop, and cottonink leaves them looking at the same page they
  // were on. redirect() throws to end the action, which is why it cannot sit
  // inside the try/catch above.
  redirect(destination ?? "/");
}
