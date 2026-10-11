"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Saves a quote: item price, shipping, service fee, note, and the status that
 * says a quote now exists.
 *
 * Roadmap 3.6 and 3.7, and the first write to a titipan_requests row by
 * somebody who does not own it. Needs migration 0022 for the update policy and
 * the five-column grant; without it Supabase answers with a row-level security
 * error and nothing changes.
 *
 * Four things are decided here and not in the form:
 *
 *   id      — checked as a uuid because it goes straight into a redirect path as
 *             well as into the query. An unchecked string from FormData is both a
 *             bad query and a path this function builds itself.
 *   money   — whole rupiah or nothing, all three figures. parseInt would read
 *             "15000.50" as 15000 and the column's check would never see the
 *             part that was thrown away, so the decimals would vanish silently
 *             instead of being refused.
 *   blank   — refused rather than stored as zero, for all three. A quote of Rp 0
 *             is a real answer (free shipping really happens) so it has to be
 *             typed on purpose, not left in a box nobody filled in. A half-typed
 *             quote that silently charges the buyer nothing for shipping is
 *             worse than one that refuses to save.
 *   status  — set here, so the FormData cannot carry `requested` and quietly
 *             un-quote a request staff already priced.
 *
 * A server action rather than a route handler, so there is no URL to bookmark and
 * no way to reach it with a GET.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WHOLE_RUPIAH = /^\d+$/;

/**
 * Reads one money field, or refuses the save.
 *
 * redirect() throws, so nothing after the refusal runs and the caller gets a
 * narrowed string back. The three fields are identical apart from their label,
 * and writing that check out three times is how one of them ends up missing the
 * safe-integer guard the other two have.
 */
function wholeRupiah(formData: FormData, key: string, label: string, path: string) {
  const raw = formData.get(key);

  if (typeof raw !== "string" || !WHOLE_RUPIAH.test(raw.trim())) {
    redirect(
      `${path}?error=${label} harus angka bulat, tanpa pemisah ribuan atau desimal.`,
    );
  }

  const trimmed = raw.trim();
  const amount = Number(trimmed);

  if (!Number.isSafeInteger(amount)) {
    redirect(`${path}?error=${label} terlalu besar.`);
  }

  return amount;
}

export async function saveTitipanQuote(formData: FormData): Promise<void> {
  const id = formData.get("id");

  // Checked before the session: a malformed id never reaches Supabase at all.
  if (typeof id !== "string" || !UUID.test(id)) {
    redirect("/staff/titipan?error=Permintaan tidak valid.");
  }

  const path = `/staff/titipan/${id}`;

  const quoteItemPrice = wholeRupiah(formData, "quoteItemPrice", "Harga barang", path);
  const quoteShipping = wholeRupiah(formData, "quoteShipping", "Ongkir", path);
  const quoteServiceFee = wholeRupiah(formData, "quoteServiceFee", "Biaya layanan", path);

  const supabase = await createClient();

  // getUser() rather than getClaims(): this is a Server Action, so the one call
  // that can be trusted with a write is worth the round trip to the Auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Migration 0022 would deny this anyway. Asking first turns "the form did
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

  const note = formData.get("quoteNote");
  const trimmedNote = typeof note === "string" ? note.trim() : "";

  const { error } = await supabase
    .from("titipan_requests")
    .update({
      quote_item_price: quoteItemPrice,
      quote_shipping: quoteShipping,
      quote_service_fee: quoteServiceFee,
      // null rather than "". A blank note is the absence of one, and 3.8 renders
      // the difference between a quote with nothing to say and a broken cell.
      quote_note: trimmedNote || null,
      status: "quoted",
    })
    .eq("id", id);

  if (error) {
    redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`${path}?saved=1`);
}