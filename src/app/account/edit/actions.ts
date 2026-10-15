"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EditAccountState = {
  message: string;
};

/**
 * Changes the signed-in buyer's display name.
 *
 * Writes full_name only — role and email are never read from the form, so a
 * forged `role=staff` in the FormData is ignored rather than validated (the
 * 1.16 rule, repeated here because this is the second form that could reopen
 * it). Migration 0040 pins the same boundary in the database: the anon key
 * holds UPDATE on full_name and nothing else.
 */
export async function updateName(
  _previousState: EditAccountState,
  formData: FormData,
): Promise<EditAccountState> {
  const fullName = formData.get("fullName");

  if (typeof fullName !== "string" || !fullName.trim()) {
    return { message: "Nama wajib diisi." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { message: "Masuk dulu sebelum mengubah data akun." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName.trim() })
    .eq("id", user.id);

  if (error) {
    return { message: "Gagal menyimpan nama. Coba lagi." };
  }

  redirect("/account/edit?saved=nama");
}

/**
 * Changes the signed-in buyer's password, after proving the old one.
 *
 * The old password is the whole point: a hijacked session must not be enough
 * to lock the real owner out, and Supabase sends no confirmation email for a
 * password change, so nothing else stands in the way. Re-authenticating with
 * signInWithPassword is what proves the human at the keyboard knows it.
 */
export async function updatePassword(
  _previousState: EditAccountState,
  formData: FormData,
): Promise<EditAccountState> {
  const currentPassword = formData.get("currentPassword");
  const newPassword = formData.get("newPassword");
  const confirmPassword = formData.get("confirmPassword");

  if (
    typeof currentPassword !== "string" ||
    typeof newPassword !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    return { message: "Data password tidak valid." };
  }

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { message: "Semua field password wajib diisi." };
  }

  if (newPassword.length < 6) {
    return { message: "Password baru minimal 6 karakter." };
  }

  if (newPassword !== confirmPassword) {
    return { message: "Password baru dan konfirmasinya tidak sama." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { message: "Masuk dulu sebelum mengubah password." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return { message: "Password lama salah." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { message: updateError.message };
  }

  redirect("/account/edit?saved=password");
}
