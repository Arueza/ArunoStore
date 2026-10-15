import { createBrowserSupabase } from "@/lib/supabase/browser";
import { buildWebpName, compressImageFile } from "@/lib/image";

/**
 * Compresses each file to WebP and uploads straight to the `shop-images`
 * bucket. Shared by the new-product form and the add-images form so the two
 * cannot drift apart on quality or path shape.
 *
 * Returns the storage paths for the server action, which receives strings
 * only — bytes through a Server Action trip the 1 MB body limit.
 */
export async function compressAndUploadShopImages(
  files: File[],
): Promise<string[]> {
  const supabase = createBrowserSupabase();
  const paths: string[] = [];

  for (const file of files) {
    const compressed = await compressImageFile(file);
    const path = `${crypto.randomUUID()}/${buildWebpName(file.name)}`;

    const { error } = await supabase.storage
      .from("shop-images")
      .upload(path, compressed, { contentType: "image/webp" });

    if (error) throw new Error(`Gagal mengunggah ${file.name}: ${error.message}`);

    paths.push(path);
  }

  return paths;
}
