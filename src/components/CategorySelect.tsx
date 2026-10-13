"use client";

import { useEffect, useState } from "react";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * Category dropdown that fetches existing categories and lets staff type a
 * new one. The new-category field is a separate input beside the dropdown,
 * so the two never fight over the same value.
 *
 * Public client: the select policy on consignment_categories is `using
 * (true)` (0012), so no session is needed. That keeps the component static
 * under cacheComponents — a server component reading through createClient()
 * would make the whole /staff/shop route dynamic and un-prerenderable.
 */
export default function CategorySelect({
  id = "category_id",
}: {
  id?: string;
}) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const supabase = createPublicClient();

    supabase
      .from("consignment_categories")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data) setCategories(data);
      });
  }, []);

  return (
    <select name={id} className="mt-1 w-full border border-[#e2ddd7] bg-white px-3 py-2 text-sm text-ink focus:border-plum focus:outline-none">
      <option value="">Tanpa kategori</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  );
}
