import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MenuView from "@/components/MenuView";
import DemoMenu from "@/components/DemoMenu";
import { DEMO } from "@/lib/config";
import { EXAMPLE_MENU } from "@/lib/demo";
import { supabaseServer } from "@/lib/supabase/server";
import { cleanDish, type Dish, type MenuData } from "@/lib/types";

type Params = { params: Promise<{ slug: string }> };

async function load(slug: string): Promise<MenuData | null> {
  if (slug === "demo") return EXAMPLE_MENU;
  if (DEMO) return null;
  const supabase = await supabaseServer();
  const { data: stall } = await supabase
    .from("stalls")
    .select("id, name, area, slug, published")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (!stall) return null;
  const { data: rows } = await supabase.from("dishes").select("*").eq("stall_id", stall.id).order("position");
  return {
    name: stall.name,
    area: stall.area,
    slug: stall.slug,
    published: true,
    dishes: (rows ?? []).map(cleanDish).filter((d): d is Dish => !!d),
  };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const m = await load(slug);
  return { title: m ? `${m.name} — Menu` : "Menu — Quán" };
}

export const revalidate = 60;

export default async function PublicMenu({ params }: Params) {
  const { slug } = await params;
  const menu = await load(slug);
  if (!menu) {
    if (DEMO) return <DemoMenu slug={slug} />;
    notFound();
  }
  return <MenuView full name={menu.name} area={menu.area} dishes={menu.dishes} />;
}
