import AccountMenu from "@/components/AccountMenu";
import { DEMO } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The signed-in vendor (if any) and their live menu address, for the header. */
async function currentVendor() {
  if (DEMO) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: stall } = await supabase.from("stalls").select("slug, published").eq("owner_id", data.user.id).maybeSingle();
  return { email: data.user.email ?? "", liveSlug: stall?.published ? stall.slug : undefined };
}

export default async function Home() {
  const me = await currentVendor();
  const start = DEMO || me ? "/dashboard" : "/login";
  return (
    <main className="page">
      <div className="wrap">
        <header className="top">
          <a className="logo" href="/">Quán<span>.</span></a>
          {me ? <AccountMenu email={me.email} liveSlug={me.liveSlug} /> : <a className="btn" href={start}>{DEMO ? "Open editor" : "Sign in"}</a>}
        </header>
        <section className="hero">
          <h1>Your menu, readable by every customer who walks past.</h1>
          <p>
            Take one photo of your menu. Quán turns it into a QR sticker that shows each dish in English, Korean,
            Chinese and Japanese, with what&apos;s in it, what it costs in their money, and how to say it.
          </p>
          <div className="row">
            <a className="btn primary" href={start}>{me ? "Open my menu" : "Make my menu"}</a>
            <a className="btn" href="/m/demo">See an example menu</a>
          </div>
        </section>
        <section className="how" aria-label="How it works">
          <div><b>1. Photograph</b><span>The board on the wall, a printed sheet, or handwriting. AI reads the dishes and prices.</span></div>
          <div><b>2. Check</b><span>Fix prices and allergens. You decide what customers see.</span></div>
          <div><b>3. Stick it up</b><span>Print the QR sticker. Change prices any time without reprinting.</span></div>
        </section>
      </div>
    </main>
  );
}
