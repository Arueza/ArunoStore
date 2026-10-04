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
  const role = formData.get("role");

  if (
    typeof fullName !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof confirmPassword !== "string" ||
    typeof role !== "string"
  ) {
    return { message: "Data pendaftaran tidak valid." };
  }

  if (!fullName.trim() || !email.trim() || !password) {
    return { message: "Semua field wajib diisi." };
  }

  if (password !== confirmPassword) {
    return { message: "Password dan konfirmasi password tidak sama." };
  }

  if (!["buyer", "artist", "staff"].includes(role)) {
    return { message: "Role tidak valid." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        role,
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