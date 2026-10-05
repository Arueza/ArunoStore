"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  // Signed-in visitors have nothing to do on /login, and 1.7 guards /dashboard,
  // so sign-in lands there. redirect() throws to end the action, which is why
  // it cannot sit inside the try/catch above.
  redirect("/dashboard");
}
