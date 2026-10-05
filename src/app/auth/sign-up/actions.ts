"use server";

import { createClient } from "@/lib/supabase/server";

export type SignUpState = {
  message: string;
};

export async function signUp(
  _previousState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const fullName = formData.get("fullName");
  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (
    typeof fullName !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    return { message: "Data pendaftaran tidak valid." };
  }

  if (!fullName.trim() || !email.trim() || !password) {
    return { message: "Semua field wajib diisi." };
  }

  if (password !== confirmPassword) {
    return { message: "Password dan konfirmasi password tidak sama." };
  }

  // Every signup is a buyer. Staff are the two of us and are promoted by hand in
  // Supabase, never from a form: the form is public, so any role it can post is a
  // role anyone can claim. Hardcoding here means a forged `role=staff` in the
  // FormData is ignored rather than validated, so the hole cannot reopen by
  // adding a field. See roadmap task 1.16.
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        role: "buyer",
      },
    },
  });

  if (error) {
    return { message: error.message };
  }

  return {
    message:
      "Pendaftaran berhasil. Silakan periksa email untuk melakukan konfirmasi.",
  };
}