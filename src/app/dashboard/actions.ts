"use server";
import { revalidatePath } from "next/cache";
import { DEMO, slugify } from "@/lib/config";
import { serverT } from "@/lib/server-ui";
import { supabaseServer } from "@/lib/supabase/server";
import { cleanDish, type Dish } from "@/lib/types";

export interface SaveResult {
  ok: boolean;
  error?: string;
  slug?: string;
}

export async function saveMenu(input: {
  name: string;
  area: string;
  slug: string;
  published: boolean;
  dishes: Dish[];
}): Promise<SaveResult> {
  const t = await serverT();
  if (DEMO) return { ok: false, error: t.srvDemoSave };

  const name = String(input.name || "").trim().slice(0, 120);
  if (!name) return { ok: false, error: t.srvNeedName };
  const slug = slugify(input.slug || name);
  if (slug.length < 3) return { ok: false, error: t.srvShortSlug };
  const dishes = (Array.isArray(input.dishes) ? input.dishes : [])
    .slice(0, 200)
    .map(cleanDish)
    .filter((d): d is Dish => !!d);

  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: t.loginExpired };

  const { error } = await supabase.rpc("save_menu", {
    p_name: name,
    p_area: String(input.area || "").trim().slice(0, 160),
    p_slug: slug,
    p_published: !!input.published,
    p_dishes: dishes,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: t.srvSlugTaken(slug) };
    console.error(error);
    return { ok: false, error: t.saveFailed };
  }
  revalidatePath(`/m/${slug}`);
  return { ok: true, slug };
}

export async function signOut() {
  if (DEMO) return;
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
}
