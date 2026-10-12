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
