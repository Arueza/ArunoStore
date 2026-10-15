/**
 * Star rating + note form for a delivered order (roadmap 5.3).
 *
 * A plain form posting to a server action — no client component, no state.
 * The result is a redirect the server decides, so ?saved=1 and ?error=… on
 * the URL are the whole of the feedback.
 *
 * Shared by both buyer lists so the two cannot drift into different wordings.
 */
export default function RatingForm({
  action,
  id,
  existingRating,
  existingNote,
}: {
  action: (formData: FormData) => void;
  id: string;
  existingRating: number | null;
  existingNote: string | null;
}) {
  return (
    <form action={action} className="mt-4 border-t border-[#eeeae5] pt-4">
      <input type="hidden" name="id" value={id} />

      <fieldset>
        <legend className="text-xs uppercase tracking-[0.14em] text-[#6c6870]">
          Rating
        </legend>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <label key={star} className="cursor-pointer">
              <input
                type="radio"
                name="rating"
                value={star}
                defaultChecked={existingRating === star}
                className="peer sr-only"
              />
              <span className="text-2xl text-[#e2ddd7] transition-colors peer-checked:text-plum peer-focus-visible:text-plum">
                ★
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label
        htmlFor={`note-${id}`}
        className="mt-3 block text-xs uppercase tracking-[0.14em] text-[#6c6870]"
      >
        Catatan (opsional)
      </label>
      <textarea
        id={`note-${id}`}
        name="note"
        rows={2}
        defaultValue={existingNote ?? ""}
        placeholder="Barang sampai cepat, packing rapi…"
        className="mt-2 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm leading-relaxed text-ink focus:border-plum focus:outline-none"
      />

      <button
        type="submit"
        className="mt-3 bg-plum px-5 py-2 text-xs uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
      >
        {existingRating ? "Perbarui rating" : "Kirim rating"}
      </button>
    </form>
  );
}
