"use server";

import { createClient } from "@/lib/supabase/server";
import { isHttpUrl } from "@/lib/url";

export type TitipanRequestState = {
  message: string;
  sent: boolean;
};

/**
 * Saves a titipan request: the product link, what the buyer knows about it, and
 * what they expect to pay.
 *
 * Roadmap 3.3 and 3.4. The buyer sends a link from a Japanese shop; staff quote
 * the item price, shipping and service fee at 3.6; the row lands as `requested`
 * and the staff queue at 3.5 picks it up.
 *
 * Five things are decided here and not in the form:
 *
 *   buyer_id — from the verified session, never the FormData. The form is
 *              client-rendered, so a `buyerId` field would let anyone file a
 *              request under somebody else's account. Same rule as 1.16 and 2.6.
 *   status   — 'requested', written here. A forged field must not be able to
 *              file a request that already reads as quoted.
 *   link     — http or https only, because staff render it as an href at 3.5.
 *   quantity — whole number, at least 1, matching 0006's `check (quantity > 0)`.
 *   budget   — whole rupiah, or nothing at all. Never 0 standing in for "I have
 *              no idea": on the staff queue a 0 budget reads as an instruction.
 *
 * A server action rather than a route handler, so there is no URL to bookmark and
 * no way to reach the insert with a GET.
 */

// Money is whole rupiah (AGENTS.md) and quantity is a count, so both go through
// the same shape check. parseInt would read "15000.50" as 15000 and the column's
// check would never see the decimals that were dropped.
const WHOLE_RUPIAH = /^\d+$/;

/** An optional text field: blank means absent, and absent is stored as null. */
function optionalText(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function submitTitipanRequest(
  _previousState: TitipanRequestState,
  formData: FormData,
): Promise<TitipanRequestState> {
  const productLink = formData.get("productLink");
  const quantity = formData.get("quantity");
  const budget = formData.get("budget");

  if (typeof productLink !== "string") {
    return { message: "Data permintaan tidak valid.", sent: false };
  }

  const trimmedLink = productLink.trim();

  if (!trimmedLink) {
    return { message: "Tautan produk wajib diisi.", sent: false };
  }

  if (!isHttpUrl(trimmedLink)) {
    return {
      message: "Tautan produk harus berupa URL http atau https.",
      sent: false,
    };
  }

  // Required, but the column defaults to 1 — so an empty box is accepted as one
  // item rather than refused. The browser sends nothing at all when the field is
  // cleared, and a buyer asking for one jacket should not be told they forgot.
  const trimmedQuantity =
    typeof quantity === "string" ? quantity.trim() : "";

  if (trimmedQuantity && !WHOLE_RUPIAH.test(trimmedQuantity)) {
    return { message: "Jumlah harus angka bulat.", sent: false };
  }

  const quantityValue = trimmedQuantity ? Number(trimmedQuantity) : 1;

  if (!Number.isSafeInteger(quantityValue) || quantityValue < 1) {
    return { message: "Jumlah harus angka bulat minimal 1.", sent: false };
  }

  const trimmedBudget = typeof budget === "string" ? budget.trim() : "";

  if (trimmedBudget && !WHOLE_RUPIAH.test(trimmedBudget)) {
    return {
      message: "Budget harus angka bulat, tanpa pemisah ribuan atau desimal.",
      sent: false,
    };
  }

  const budgetValue = trimmedBudget ? Number(trimmedBudget) : null;

  if (budgetValue !== null && !Number.isSafeInteger(budgetValue)) {
    return { message: "Budget terlalu besar.", sent: false };
  }

  const supabase = await createClient();

  // getUser() rather than getClaims(): this is a Server Action, so the one call
  // that can be trusted with a write is worth the round trip to the Auth server.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { message: "Sesi kamu habis. Masuk lagi untuk mengirim.", sent: false };
  }

  const { error } = await supabase.from("titipan_requests").insert({
    // From the session, not the FormData. See the note above.
    buyer_id: user.id,
    product_link: trimmedLink,
    // null rather than "" for both: the columns are nullable and staff renders
    // the difference between "no size given" and an empty text box.
    size: optionalText(formData.get("size")),
    color: optionalText(formData.get("color")),
    quantity: quantityValue,
    budget: budgetValue,
    status: "requested",
  });

  if (error) {
    return { message: error.message, sent: false };
  }

  return {
    message: "Permintaan terkirim. Staf akan mengecek produknya lalu mengirim kutipan.",
    sent: true,
  };
}