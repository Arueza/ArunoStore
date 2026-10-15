"use server";

import { createClient } from "@/lib/supabase/server";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_NAME = 100;
const MAX_ADDRESS = 500;
const MAX_NOTE = 500;

export type SaveAddressResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Saves the shipping address on an accepted commission or titipan request.
 *
 * The row is created address-less by the request form; the buyer fills this
 * form on /checkout before the Snap button appears, so no paid order can
 * exist without somewhere to send the parcel. Staff reads the same row
 * when packing.
 *
 * Same shape as saveShopOrderAddress (0041): ownership and status checked
 * here for a friendly message, enforced again by the policy + grant.
 * Only the seven address columns are written — the grant blocks everything
 * else, so a buyer cannot reprice or un-accept their own order.
 */
export async function saveAddress(
  type: "commission" | "titipan",
  orderId: string,
  formData: FormData,
): Promise<SaveAddressResult> {
  if (!UUID.test(orderId)) {
    return { ok: false, message: "Pesanan tidak valid." };
  }

  const field = (key: string) => {
    const raw = formData.get(key);
    return typeof raw === "string" ? raw.trim() : "";
  };

  const recipientName = field("recipient_name");
  const phone = field("phone");
  const address = field("address");
  const city = field("city");
  const province = field("province");
  const postalCode = field("postal_code");
  const note = field("note");

  if (!recipientName) {
    return { ok: false, message: "Nama penerima wajib diisi." };
  }
  if (recipientName.length > MAX_NAME) {
    return { ok: false, message: "Nama penerima maksimal 100 karakter." };
  }

  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 9 || phoneDigits.length > 15) {
    return { ok: false, message: "Nomor HP tidak valid (9–15 digit)." };
  }

  if (!address) {
    return { ok: false, message: "Alamat lengkap wajib diisi." };
  }
  if (address.length > MAX_ADDRESS) {
    return { ok: false, message: "Alamat maksimal 500 karakter." };
  }

  if (!city) {
    return { ok: false, message: "Kota/kabupaten wajib diisi." };
  }
  if (city.length > MAX_NAME) {
    return { ok: false, message: "Kota/kabupaten maksimal 100 karakter." };
  }

  if (!province) {
    return { ok: false, message: "Provinsi wajib diisi." };
  }
  if (province.length > MAX_NAME) {
    return { ok: false, message: "Provinsi maksimal 100 karakter." };
  }

  if (!/^\d{5}$/.test(postalCode)) {
    return { ok: false, message: "Kode pos harus 5 digit angka." };
  }

  if (note.length > MAX_NOTE) {
    return { ok: false, message: "Catatan maksimal 500 karakter." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sesi berakhir, silakan masuk lagi." };
  }

  const table = type === "commission" ? "commissions" : "titipan_requests";

  const { data: order } = await supabase
    .from(table)
    .select("id, buyer_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.buyer_id !== user.id) {
    return { ok: false, message: "Pesanan tidak ditemukan." };
  }

  if (order.status !== "accepted") {
    return { ok: false, message: "Pesanan ini sudah tidak bisa diubah." };
  }

  const { error } = await supabase
    .from(table)
    .update({
      recipient_name: recipientName,
      phone,
      address,
      city,
      province,
      postal_code: postalCode,
      note: note || null,
    })
    .eq("id", orderId);

  if (error) {
    return { ok: false, message: `Gagal menyimpan alamat: ${error.message}` };
  }

  return { ok: true };
}
