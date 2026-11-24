import { ArrowRight, ChartColumn, Check, Languages, QrCode, ReceiptText, Smartphone, Volume2 } from "lucide-react";
import AccountMenu from "@/components/AccountMenu";
import MenuView from "@/components/MenuView";
import { LangSwitch, UiProvider } from "@/components/Ui";
import { uiLang } from "@/lib/server-ui";
import { STRINGS } from "@/lib/strings";
import { DEMO } from "@/lib/config";
import { EXAMPLE_MENU } from "@/lib/demo";
import { liveRates } from "@/lib/rates";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The signed-in vendor (if any) and their live menu address, for the header. */
async function currentVendor() {
  if (DEMO) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  // An account can run several stalls: link the most recently edited live one.
  const { data: stalls } = await supabase.from("stalls").select("slug").eq("owner_id", data.user.id).eq("published", true)
    .order("updated_at", { ascending: false }).limit(1);
  return { email: data.user.email ?? "", liveSlug: stalls?.[0]?.slug as string | undefined };
}

const FEAT_ICONS = [Languages, Volume2, ReceiptText, QrCode, Smartphone, ChartColumn];
const ic = { className: "i", "aria-hidden": true } as const;

export default async function Home() {
  const [me, lang, rates] = await Promise.all([currentVendor(), uiLang(), liveRates()]);
  const t = STRINGS[lang];
  const start = DEMO || me ? "/dashboard" : "/login";
  // The headline with one phrase in italics ("đọc được" / "every customer").
  const [before, after] = t.heroTitle.split(t.heroTitleEm);
  return (
    <UiProvider lang={lang}>
    <main className="page landing">
      <div className="wrap">
        <header className="top">
          <a className="logo" href="/">Quán<span>.</span></a>
          <div className="row">
            <LangSwitch />
            {me ? <AccountMenu email={me.email} liveSlug={me.liveSlug} /> : <a className="btn" href={start}>{DEMO ? t.homeOpenEditor : t.homeSignIn}</a>}
          </div>
        </header>

        <section className="l-hero">
          <div className="l-copy">
            <span className="eyebrow-pill">{t.heroEyebrow}</span>
            <h1>{after === undefined ? t.heroTitle : <>{before}<em>{t.heroTitleEm}</em>{after}</>}</h1>
            <p>{t.heroText}</p>
            <div className="row">
              <a className="btn primary" href={start}>{me ? t.heroMine : t.heroStart} <ArrowRight {...ic} /></a>
              <a className="btn" href="/m/demo">{t.heroExample}</a>
            </div>
            <ul className="l-proof">
              {t.heroProof.map((x) => <li key={x}><Check {...ic} /> {x}</li>)}
            </ul>
          </div>
          {/* A real, working menu: the same component customers get, with the sample stall. */}
          <div className="l-demo">
            <div className="phone">
              <MenuView name={EXAMPLE_MENU.name} area={EXAMPLE_MENU.area} dishes={EXAMPLE_MENU.dishes} rates={rates} />
            </div>
            <small>{t.demoCaption}</small>
          </div>
        </section>

        <div className="l-langs" aria-hidden>
          <span lang="en">English</span><span lang="ko">한국어</span><span lang="zh">中文</span><span lang="ja">日本語</span><span lang="vi">Tiếng Việt</span>
        </div>

        <h2 className="l-h2">{t.howTitle}</h2>
        <section className="how" aria-label={t.howLabel}>
          {t.how.map(([b, span]) => <div key={b}><b>{b}</b><span>{span}</span></div>)}
        </section>

        <h2 className="l-h2">{t.featsTitle}</h2>
        <p className="l-sub">{t.featsSub}</p>
        <section className="feats">
          {t.feats.map(([b, span], k) => {
            const Icon = FEAT_ICONS[k] ?? Check;
            return (
              <div className="feat" key={b}>
                <span className="ic"><Icon aria-hidden /></span>
                <b>{b}</b>
                <span>{span}</span>
              </div>
            );
          })}
        </section>

        <section className="l-cta">
          <h2>{t.ctaTitle}</h2>
          <p>{t.ctaText}</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <a className="btn inverse" href={start}>{me ? t.heroMine : t.heroStart} <ArrowRight {...ic} /></a>
            <a className="btn" href="/m/demo-cafe">{t.heroExample}</a>
          </div>
        </section>

        <footer className="l-foot">
          <span><b className="logo" style={{ fontSize: 18 }}>Quán<span>.</span></b> · {t.footNote}</span>
          <a href="/m/demo">/m/demo</a>
        </footer>
      </div>
    </main>
    </UiProvider>
  );
}
