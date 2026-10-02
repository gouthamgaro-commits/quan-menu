import { redirect } from "next/navigation";
import Editor from "@/components/Editor";
import { DEMO, SITE_URL } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";
import { cleanDish, type Dish, type MenuData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your menu — Quán" };

export default async function Dashboard() {
  if (DEMO) return <Editor initial={null} demo siteUrl={SITE_URL} />;

  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: stall } = await supabase
    .from("stalls")
    .select("id, name, area, slug, published")
    .eq("owner_id", auth.user.id)
    .maybeSingle();

  let initial: MenuData | null = null;
  if (stall) {
    const { data: rows } = await supabase.from("dishes").select("*").eq("stall_id", stall.id).order("position");
    initial = {
      name: stall.name,
      area: stall.area,
      slug: stall.slug,
      published: stall.published,
      dishes: (rows ?? []).map(cleanDish).filter((d): d is Dish => !!d),
    };
  }

  return <Editor initial={initial} demo={false} siteUrl={SITE_URL} email={auth.user.email ?? ""} />;
}
