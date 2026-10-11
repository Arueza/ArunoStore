"use server";

import { createClient } from "@/lib/supabase/server";
import { isHttpUrl } from "@/lib/url";

export type RequestState = {
  message: string;
  sent: boolean;
};

// isHttpUrl moved to src/lib/url.ts at 3.3. Only http and https are stored,
// because `reference_links` is plain text[] with no constraint on it and a staff
// view renders these as hrefs — a stored `javascript:` link would run when staff
// opened the request. Refused at submit time, because once the row exists the bad
// value is already in the database and every reader inherits it. Titipan's
// product_link answers the same question, so it answers it with the same code.

export async function submitRequest(
  _previousState: RequestState,
  formData: FormData,
): Promise<RequestState> {
  const serviceId = formData.get("serviceId");
  const brief = formData.get("brief");

  if (typeof serviceId !== "string" || typeof brief !== "string") {
    return { message: "Data permintaan tidak valid.", sent: false };
  }

  const trimmedBrief = brief.trim();

  if (!serviceId || !trimmedBrief) {
    return { message: "Layanan dan brief wajib diisi.", sent: false };
  }

  const links = formData
    .getAll("link")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  if (links.some((link) => !isHttpUrl(link))) {
    return { message: "Link referensi harus berupa URL http atau https.", sent: false };
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

  const { error } = await supabase.from("commissions").insert({
    // buyer_id comes from the verified session, never the FormData: the form is
    // client-rendered, so a `buyerId` field would let anyone file a request under
    // somebody else's account. Same rule as the role field in task 1.16.
    buyer_id: user.id,
    service_id: serviceId,
    brief: trimmedBrief,
    reference_links: links,
    status: "requested",
  });

  if (error) {
    return { message: error.message, sent: false };
  }

  return {
    message: "Permintaan terkirim. Nobu akan mengirim kutipan harga.",
    sent: true,
  };
}