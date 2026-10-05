import { getClaims, getProfile } from "@/lib/auth";

// The two roles in words rather than as `buyer` / `staff`, because the buyer is
// the one reading this and the column value is not English. There is no artist
// role: staff cover both halves, so the note has to speak for either one.
const ROLE_LABEL: Record<string, string> = {
  buyer: "Pembeli",
  staff: "Staf",
};

const ROLE_NOTE: Record<string, string> = {
  buyer:
    "Kamu memesan commission atau titipan, lalu membayar setelah kutipan diterima.",
  staff:
    "Kamu mengecek permintaan, memberikan kutipan, lalu mengunggah hasil commission atau mengirim barang titipan.",
};

/**
 * The signed-in visitor's own details, read from the profiles row.
 *
 * Split out of page.tsx and rendered behind a <Suspense> boundary by it, for the
 * reason AuthSlot is: reading the session calls cookies(), which stops Next
 * prerendering the route unless the read sits behind a boundary. Same rule as
 * roadmap 1.12 and 1.13, and the reason the rest of /account is a static shell.
 *
 * In its own file so a test can await it directly — React's client renderer
 * cannot render an async Server Component.
 *
 * Reads the profile rather than the JWT, because the role is the app's own
 * buyer/staff and Supabase Auth knows nothing about it.
 */
export default async function AccountDetails() {
  const [claims, profile] = await Promise.all([getClaims(), getProfile()]);

  const email = claims?.email ?? "";
  const role = profile?.role ?? "";
  const roleLabel = ROLE_LABEL[role] ?? role;

  return (
    <>
      <dl className="mt-8 divide-y divide-[#eeeae5] border-y border-[#eeeae5]">
        <Row label="Nama">{profile?.full_name?.trim() || "Belum diisi"}</Row>
        <Row label="Email">{email || "—"}</Row>
        <Row label="Peran">{roleLabel || "—"}</Row>
      </dl>

      {/* The role decides what the visitor can reach, so say what it means rather
          than leaving a bare label on screen. */}
      {role && (
        <p className="mt-6 text-sm leading-relaxed text-[#6c6870]">
          {ROLE_NOTE[role] ??
            "Peran ini belum punya keterangan. Hubungi admin toko."}
        </p>
      )}

      {!profile && (
        <p className="mt-6 rounded border border-[#eeeae5] bg-[#f3f0ec] px-4 py-3 text-sm text-[#6c6870]">
          Data profilmu belum lengkap. Tulis ulang email konfirmasi atau hubungi
          admin toko.
        </p>
      )}
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 py-4">
      <dt className="w-24 shrink-0 text-sm text-[#6c6870]">{label}</dt>
      <dd className="text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}