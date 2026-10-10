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

  redirect("/commissions/mine?saved=1");
}
