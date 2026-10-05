"use server";
import { revalidatePath } from "next/cache";
import { DEMO, slugify } from "@/lib/config";
import { serverT } from "@/lib/server-ui";
import { supabaseServer } from "@/lib/supabase/server";
import { cleanDish, cleanKind, cleanToppings, type Dish, type ShopKind, type Topping } from "@/lib/types";

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
  kind?: ShopKind;
  toppings?: Topping[];
}): Promise<SaveResult> {
  const t = await serverT();
  if (DEMO) return { ok: false, error: t.srvDemoSave };

  const name = String(input.name || "").trim().slice(0, 120);
  if (!name) return { ok: false, error: t.srvNeedName };
  const slug = slugify(input.slug || name);
  if (slug.length < 3) return { ok: false, error: t.srvShortSlug };
  // These addresses always show the sample menus, so a real stall can't use them.
  if (slug === "demo" || slug === "demo-cafe") return { ok: false, error: t.srvSlugTaken(slug) };
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
  // Shop type and toppings live on the stall row; owners may update it under row-level security.
  const { error: extra } = await supabase
    .from("stalls")
    .update({ kind: cleanKind(input.kind), toppings: cleanToppings(input.toppings) })
    .eq("owner_id", auth.user.id);
  if (extra) console.error("[save] shop type/toppings not saved. Has the latest supabase/schema.sql been run?", extra.message);
  revalidatePath(`/m/${slug}`);
  return { ok: true, slug };
}

export async function signOut() {
  if (DEMO) return;
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
}
