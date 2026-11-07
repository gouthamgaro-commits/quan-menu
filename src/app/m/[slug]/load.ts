import { cache } from "react";
import { DEMO } from "@/lib/config";
import { EXAMPLE_MENU } from "@/lib/demo";
import { EXAMPLE_CAFE } from "@/lib/demo-cafe";
import { supabasePublic } from "@/lib/supabase/public";
import { cleanDay, cleanDish, cleanKind, cleanMaps, cleanPay, cleanSoldOut, cleanToppings, vnToday, type Dish, type MenuData } from "@/lib/types";

/** The sample menus: always available, never counted, and kept out of search engines. */
export const isDemoSlug = (slug: string) => slug === "demo" || slug === "demo-cafe";

/**
 * A live menu, or null if there is none at this address. Shared by the page, its metadata and its
 * share image, so each render queries the database once.
 */
export const loadMenu = cache(async (slug: string): Promise<MenuData | null> => {
  // The food example shows one dish sold out, so vendors can see what customers see.
  if (slug === "demo") return { ...EXAMPLE_MENU, soldOut: { day: vnToday(), names: ["Hủ tiếu Nam Vang"] } };
  if (slug === "demo-cafe") return EXAMPLE_CAFE;
  if (DEMO) return null;
  const supabase = supabasePublic();
  const { data: stall, error } = await supabase
    .from("stalls")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  // A database hiccup must not look like a missing or empty menu: throwing keeps serving the last
  // good copy of this page (or shows "try again" if there is none) instead of caching "not found".
  if (error) throw new Error(`Menu ${slug} could not be loaded: ${error.message}`);
  if (!stall) return null;
  const { data: rows, error: dishError } = await supabase.from("dishes").select("*").eq("stall_id", stall.id).order("position");
  if (dishError) throw new Error(`Dishes for ${slug} could not be loaded: ${dishError.message}`);
  return {
    name: stall.name,
    area: stall.area,
    slug: stall.slug,
    published: true,
    dishes: rows.map(cleanDish).filter((d): d is Dish => !!d),
    kind: cleanKind(stall.kind),
    toppings: cleanToppings(stall.toppings),
    pay: cleanPay(stall.pay),
    maps: cleanMaps(stall.maps),
    soldOut: cleanSoldOut(stall.sold_out),
    closedUntil: cleanDay(stall.closed_until),
    updatedAt: stall.updated_at,
  };
});
