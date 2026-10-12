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
