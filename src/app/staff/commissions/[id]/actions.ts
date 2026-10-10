"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Saves a quote: price, note, and the status that says a quote now exists.
 *
 * Roadmap 2.10, and the first write to a commissions row by somebody who does not
 * own it. Needs migration 0018 for the update policy and the three-column grant;
 * without it Supabase answers with a row-level security error and nothing changes.
 *
 * Three things are decided here and not in the form:
 *
 *   id     — checked as a uuid because it goes straight into a redirect path as
 *            well as into the query. An unchecked string from FormData is both a
 *            bad query and a path this function builds itself.
 *   price  — whole rupiah or nothing. parseInt would read "15000.50" as 15000 and
 *            the check on the column would never see the part that was thrown
 *            away, so the decimals would vanish silently instead of being refused.
 *   status — set here, so the FormData cannot carry `requested` and quietly
 *            un-quote a request staff already priced.
 *
 * A server action rather than a route handler, so there is no URL to bookmark and
 * no way to reach it with a GET.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WHOLE_RUPIAH = /^\d+$/;

export async function saveQuote(formData: FormData): Promise<void> {
  const id = formData.get("id");
  const price = formData.get("quotePrice");
  const note = formData.get("quoteNote");

  // Checked before the session: a malformed id never reaches Supabase at all.
  if (typeof id !== "string" || !UUID.test(id)) {
    redirect("/staff?error=Permintaan tidak valid.");
  }

  if (typeof price !== "string") {
    redirect(`/staff/commissions/${id}?error=Harga wajib diisi.`);
  }

  const trimmedPrice = price.trim();

  // Empty is refused rather than stored as zero. A quote of Rp 0 is a real
  // answer, so it has to be typed, not left in a box nobody filled in.
  if (!WHOLE_RUPIAH.test(trimmedPrice)) {
    redirect(
      `/staff/commissions/${id}?error=Harga harus angka bulat, tanpa pemisah ribuan atau desimal.`,
    );
  }

  const quotePrice = Number(trimmedPrice);

  if (!Number.isSafeInteger(quotePrice)) {
    redirect(`/staff/commissions/${id}?error=Harga terlalu besar.`);
  }

  const supabase = await createClient();

  // getUser() rather than getClaims(): this is a Server Action, so the one call
  // that can be trusted with a write is worth the round trip to the Auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Migration 0018 would deny this update anyway. Asking first turns "the form did
  // nothing" into a redirect that says why, instead of an error string from
  // Postgres that a member of staff has no way to act on.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "staff") {
    redirect("/");
  }

  const trimmedNote = typeof note === "string" ? note.trim() : "";

  const { error } = await supabase
    .from("commissions")
    .update({
      quote_price: quotePrice,
      // null rather than "". A blank note is the absence of one, and 2.11 renders
      // the difference between a quote with nothing to say and a broken cell.
      quote_note: trimmedNote || null,
      status: "quoted",
    })
    .eq("id", id);

  if (error) {
    redirect(
      `/staff/commissions/${id}?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(`/staff/commissions/${id}?saved=1`);
}

/**
 * Saves the storage path of a finished drawing on a commission.
 *
 * Roadmap 2.13. The upload itself happens client-side — the browser Supabase
 * client puts the file in the 'commission-deliveries' bucket, which only staff
 * can write to (0021's storage policy). This action receives the path that
 * upload returned and writes it to the commissions row.
 *
 * The path comes from the upload result, not from user input — but it is still
 * a string in a FormData, so it is checked for shape: not empty, no path
 * traversal. The bucket is private and the path uses crypto.randomUUID(), so
 * the only way to get a real path is to have uploaded the file.
 *
 * Same staff check as saveQuote: a buyer calling this action is sent to the
 * store. The column grant from 0021 lets staff write delivery_image; 0018's
 * buyer update policy does not grant it, and even if it did, the buyer has no
 * path to write.
 */
export async function saveDeliveryImage(formData: FormData): Promise<void> {
  const id = formData.get("id");
  const path = formData.get("path");

  if (typeof id !== "string" || !UUID.test(id)) {
    redirect("/staff?error=Permintaan tidak valid.");
  }

  if (typeof path !== "string" || !path.trim() || path.includes("..")) {
    redirect(`/staff/commissions/${id}?error=Path gambar tidak valid.`);
  }

  const trimmedPath = path.trim();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "staff") {
    redirect("/");
  }

  // Clean up the old image if one exists, so a replacement does not leave an
  // orphan in the bucket. The path column holds the previous path; if the
  // upload is replacing it, the old file is unreachable after this.
  const { data: existing } = await supabase
    .from("commissions")
    .select("delivery_image")
    .eq("id", id)
    .maybeSingle();

  if (existing?.delivery_image && existing.delivery_image !== trimmedPath) {
    await supabase.storage
      .from("commission-deliveries")
      .remove([existing.delivery_image]);
  }

  const { error } = await supabase
    .from("commissions")
    .update({ delivery_image: trimmedPath })
    .eq("id", id);

  if (error) {
    redirect(
      `/staff/commissions/${id}?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(`/staff/commissions/${id}?saved=1`);
}