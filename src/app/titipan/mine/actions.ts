"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function respondToQuote(formData: FormData): Promise<void> {
  const id = formData.get("id");
  const decision = formData.get("decision");

  if (typeof id !== "string" || !UUID.test(id)) {
    redirect("/titipan/mine?error=Permintaan tidak valid.");
  }

  if (decision !== "accept" && decision !== "decline") {
    redirect(`/titipan/mine?error=Pilihan tidak valid.`);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: request } = await supabase
    .from("titipan_requests")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (!request) {
    redirect("/titipan/mine?error=Permintaan tidak ditemukan.");
  }

  if (request.status !== "quoted") {
    redirect(
      `/titipan/mine?error=Permintaan ini belum punya kutipan atau sudah diputuskan.`,
    );
  }

  const { error } = await supabase
    .from("titipan_requests")
    .update({ status: decision === "accept" ? "accepted" : "declined" })
    .eq("id", id);

  if (error) {
    redirect(
      `/titipan/mine?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect("/titipan/mine?saved=1");
}

/**
 * Buyer confirms the parcel has arrived.
 *
 * Roadmap 3.12. The buyer update policy from 0028 already covers this write.
 * The row is read first and checked to be `shipped`, so the buyer cannot mark
 * something as arrived before staff have sent it.
 */
export async function markAsArrived(formData: FormData): Promise<void> {
  const id = formData.get("id");

  if (typeof id !== "string" || !UUID.test(id)) {
    redirect("/titipan/mine?error=Permintaan tidak valid.");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: request } = await supabase
    .from("titipan_requests")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (!request) {
    redirect("/titipan/mine?error=Permintaan tidak ditemukan.");
  }

  if (request.status !== "shipped") {
    redirect(
      `/titipan/mine?error=Permintaan ini belum dikirim atau sudah ditandai sampai.`,
    );
  }

  const { error } = await supabase
    .from("titipan_requests")
    .update({ status: "arrived" })
    .eq("id", id);

  if (error) {
    redirect(
      `/titipan/mine?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect("/titipan/mine?saved=1");
}

/**
 * Buyer rates a delivered titipan (roadmap 5.3).
 *
 * Gate: status must be 'arrived' — the parcel has reached the buyer. The row
 * is read first and checked; the update policy from 0028 already restricts
 * writes to the buyer's own row, and the column grant from 0042 covers rating
 * and rating_note.
 *
 * rating is 1-5 whole number or nothing. Blank note stores null, not "".
 */
export async function saveRating(formData: FormData): Promise<void> {
  const id = formData.get("id");
  const rating = formData.get("rating");
  const note = formData.get("note");

  if (typeof id !== "string" || !UUID.test(id)) {
    redirect("/titipan/mine?error=Permintaan tidak valid.");
  }

  if (rating !== null && rating !== undefined && rating !== "") {
    const ratingStr = String(rating).trim();
    if (!/^[1-5]$/.test(ratingStr)) {
      redirect(`/titipan/mine?error=Rating harus 1 sampai 5.`);
    }
  }

  const ratingNum =
    rating === null || rating === undefined || rating === ""
      ? null
      : Number(String(rating).trim());

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: request } = await supabase
    .from("titipan_requests")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (!request) {
    redirect("/titipan/mine?error=Permintaan tidak ditemukan.");
  }

  if (request.status !== "arrived") {
    redirect(`/titipan/mine?error=Permintaan ini belum sampai.`);
  }

  const trimmedNote = typeof note === "string" ? note.trim() : "";

  const { error } = await supabase
    .from("titipan_requests")
    .update({
      rating: ratingNum,
      rating_note: trimmedNote || null,
    })
    .eq("id", id);

  if (error) {
    redirect(
      `/titipan/mine?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect("/titipan/mine?saved=1");
}
