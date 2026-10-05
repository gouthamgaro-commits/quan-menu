import { redirect } from "next/navigation";
import Editor from "@/components/Editor";
import { UiProvider } from "@/components/Ui";
import { uiLang } from "@/lib/server-ui";
import { DEMO, SITE_URL } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";
import { cleanDish, cleanKind, cleanToppings, type Dish, type MenuData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Thực đơn của bạn · Quán" };

export default async function Dashboard() {
  // Mirrors requireVendor(): without logins, AI only runs in local development.
  const ai = !!process.env.ANTHROPIC_API_KEY && (!DEMO || process.env.NODE_ENV !== "production");
  const lang = await uiLang();
  if (DEMO) return <UiProvider lang={lang}><Editor initial={null} demo ai={ai} siteUrl={SITE_URL} /></UiProvider>;

  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: stall } = await supabase
    .from("stalls")
    .select("*")
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
      kind: cleanKind(stall.kind),
      toppings: cleanToppings(stall.toppings),
    };
  }

  return <UiProvider lang={lang}><Editor initial={initial} demo={false} ai={ai} siteUrl={SITE_URL} email={auth.user.email ?? ""} /></UiProvider>;
}
