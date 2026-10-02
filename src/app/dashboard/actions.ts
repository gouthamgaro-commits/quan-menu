"use server";
import { revalidatePath } from "next/cache";
import { DEMO, slugify } from "@/lib/config";
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
  if (DEMO) return { ok: false, error: "Saving to the server needs Supabase. In demo mode your menu is kept in this browser." };

  const name = String(input.name || "").trim().slice(0, 120);
  if (!name) return { ok: false, error: "Add your stall's name first." };
  const slug = slugify(input.slug || name);
  if (slug.length < 3) return { ok: false, error: "The web address needs at least 3 letters or numbers." };
  const dishes = (Array.isArray(input.dishes) ? input.dishes : [])
    .slice(0, 200)
    .map(cleanDish)
    .filter((d): d is Dish => !!d);

  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Your login expired. Sign in again." };

  const { error } = await supabase.rpc("save_menu", {
    p_name: name,
    p_area: String(input.area || "").trim().slice(0, 160),
    p_slug: slug,
    p_published: !!input.published,
    p_dishes: dishes,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: `The address “${slug}” is taken. Try adding your street, e.g. ${slug}-q1.` };
    console.error(error);
    return { ok: false, error: "Couldn't save. Check your connection and try again." };
  }
  revalidatePath(`/m/${slug}`);
  return { ok: true, slug };
}

export async function signOut() {
  if (DEMO) return;
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
}
