"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * A buyer accepts or declines a quote on their own commission.
 *
 * Roadmap 2.12. The buyer sees the price staff set at 2.10 and says yes or no.
 * A decline is final — staff cannot re-quote the same request; the buyer sends
 * a new one. An accept moves the row to the state 2.13 waits on before staff
 * upload the finished drawing.
 *
 * Same three things decided here and not in the form, for the same reasons
 * saveQuote decides them:
 *
 *   id       — checked as a uuid because it goes into a redirect path.
 *   decision — only "accept" or "decline"; anything else is refused before
 *              Supabase is touched, so a forged field cannot move status to
 *              an arbitrary value.
 *   status   — set here, never read from the form. The buyer cannot quote
 *              their own request or un-decline one.
 *
 * A buyer can only act on a row that is currently "quoted". Accepting or
 * declining an already-decided request is a no-op that redirects with an
 * error, so the buyer's list cannot show two contradicting buttons after
 * the first press.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function respondToQuote(formData: FormData): Promise<void> {
  const id = formData.get("id");
  const decision = formData.get("decision");

  if (typeof id !== "string" || !UUID.test(id)) {
    redirect("/commissions/mine?error=Permintaan tidak valid.");
  }

  if (decision !== "accept" && decision !== "decline") {
    redirect(`/commissions/mine?error=Pilihan tidak valid.`);
  }

  const supabase = await createClient();

  // getUser() rather than getClaims(): this is a Server Action, so the one
  // call that can be trusted with a write is worth the round trip.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Read the row before writing it. RLS restricts this to the buyer's own
  // commissions (0005's "Buyers read their own commissions"), so a buyer
  // cannot act on somebody else's request. The status check below is what
  // makes a decline final and an accept irreversible from the buyer side.
  const { data: commission } = await supabase
    .from("commissions")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (!commission) {
    redirect("/commissions/mine?error=Permintaan tidak ditemukan.");
  }

  if (commission.status !== "quoted") {
    redirect(
      `/commissions/mine?error=Permintaan ini belum punya kutipan atau sudah diputuskan.`,
    );
  }

  const { error } = await supabase
    .from("commissions")
    .update({ status: decision === "accept" ? "accepted" : "declined" })
    .eq("id", id);

  if (error) {
    redirect(
      `/commissions/mine?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(decision === "accept" ? `/checkout?type=commission&id=${id}` : "/commissions/mine?saved=1");
}

/**
 * Buyer rates a delivered commission (roadmap 5.3).
 *
 * Gate: delivery_image must be set — the drawing has been delivered. Without
 * this a buyer could rate before staff finished. The row is read first and
 * checked; the update policy from 0020 already restricts writes to the buyer's
 * own row, and the column grant from 0042 covers rating and rating_note.
 *
 * rating is 1-5 whole number or nothing. Blank note stores null, not "".
 */
export async function saveRating(formData: FormData): Promise<void> {
  const id = formData.get("id");
  const rating = formData.get("rating");
  const note = formData.get("note");

  if (typeof id !== "string" || !UUID.test(id)) {
    redirect("/commissions/mine?error=Permintaan tidak valid.");
  }

  if (rating !== null && rating !== undefined && rating !== "") {
    const ratingStr = String(rating).trim();
    if (!/^[1-5]$/.test(ratingStr)) {
      redirect(`/commissions/mine?error=Rating harus 1 sampai 5.`);
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

  const { data: commission } = await supabase
    .from("commissions")
    .select("delivery_image")
    .eq("id", id)
    .maybeSingle();

  if (!commission) {
    redirect("/commissions/mine?error=Permintaan tidak ditemukan.");
  }

  if (!commission.delivery_image) {
    redirect(
      `/commissions/mine?error=Permintaan ini belum selesai dikerjakan.`,
    );
  }

  const trimmedNote = typeof note === "string" ? note.trim() : "";

  const { error } = await supabase
    .from("commissions")
    .update({
      rating: ratingNum,
      rating_note: trimmedNote || null,
    })
    .eq("id", id);

  if (error) {
    redirect(
      `/commissions/mine?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect("/commissions/mine?saved=1");
}
