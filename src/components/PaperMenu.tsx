"use client";
import { useEffect, useState } from "react";
import { ALLERGENS, LANGS, vnd } from "@/lib/i18n";
import { sectionKnown, sectionName, sectionsOf } from "@/lib/sections";
import { LANG_KEYS, type Dish, type Lang, type MenuData } from "@/lib/types";
import QrImage from "./QrImage";
import { LangSwitch, useUi } from "./Ui";

const MENU: Record<Lang, string> = { en: "Menu", ko: "메뉴", zh: "菜单", ja: "メニュー" };

/** What the QR code on the paper menu offers, in the second language. */
const SCAN: Record<Lang, string> = {
  en: "Scan for photos, prices in your currency and how to say each dish",
  ko: "스캔하면 사진, 내 통화 가격, 발음을 볼 수 있어요",
  zh: "扫码查看图片、本国货币价格和发音",
  ja: "スキャンで写真・自国通貨の価格・発音を表示",
};

/**
 * An A4 menu to print: every dish in Vietnamese and one other language, by section, with prices,
 * and a QR code to the full menu (photos, four languages, ordering). Two columns, nothing split
 * across columns or pages.
 */
export default function PaperMenu({ menu, slug, siteUrl, lang: start }: { menu: MenuData; slug: string; siteUrl: string; lang: Lang }) {
  const { t } = useUi();
  const [lang, setLang] = useState<Lang>(start);
  const [base, setBase] = useState(siteUrl);
  useEffect(() => {
    if (!siteUrl) setBase(window.location.origin);
  }, [siteUrl]);
  useEffect(() => {
    window.history.replaceState(null, "", `?l=${lang}`);
  }, [lang]);

  const url = `${base}/m/${slug}`;
  const groups = sectionsOf(menu.dishes) ?? [{ cat: "", idx: menu.dishes.map((_, i) => i) }];
  const named = groups.length > 1 || !!groups[0]?.cat;

  const item = (d: Dish, k: number) => {
    const other = d.name?.[lang] || d.name?.en || "";
    const notes = [d.spice ? "🌶".repeat(d.spice) : "", ...d.alg.map((a) => ALLERGENS[a][lang])].filter(Boolean).join(" · ");
    return (
      <div className="pm-item" key={k}>
        <div className="pm-row">
          <b lang="vi">{d.special ? "⭐ " : ""}{d.vi}</b>
          <span className="pm-dots" aria-hidden />
          <span className="pm-price">
            {d.opts?.sizes?.length ? d.opts.sizes.map((z) => `${z.k} ${vnd(z.price)}`).join(" · ") : vnd(d.price)}
          </span>
        </div>
        {(other || notes) && (
          <div className="pm-sub" lang={lang}>{other}{other && notes ? " · " : ""}{notes && <i>{notes}</i>}</div>
        )}
      </div>
    );
  };

  return (
    <main className="page paper-page">
      <div className="wrap">
        <div className="no-print flyer-controls">
          <header className="top">
            <a className="btn" href={`/dashboard?s=${encodeURIComponent(slug)}`}>{t.flyerBack}</a>
            <LangSwitch />
          </header>
          <h1>{t.paperTitle}</h1>
          <p className="status">{t.paperHint}</p>
          <div className="row">
            <label className="f" style={{ width: 200 }}>{t.paperLang}
              <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
                {LANG_KEYS.map((k) => <option key={k} value={k}>{LANGS[k].label}</option>)}
              </select>
            </label>
            <button className="btn primary" style={{ alignSelf: "end" }} onClick={() => window.print()}>🖨 {t.paperPrint}</button>
          </div>
        </div>

        <article className="paper" lang="vi">
          <header className="pm-head">
            <div>
              <h1>{menu.name}</h1>
              {menu.area && <p>{menu.area}</p>}
              <p className="pm-langs">Thực đơn · <span lang={lang}>{MENU[lang]}</span></p>
            </div>
            <figure className="pm-qr">
              <QrImage text={url} size={128} label={t.qrFor(url)} />
              <figcaption>
                <b>Quét mã: ảnh món, 4 thứ tiếng</b>
                <span lang={lang}>{SCAN[lang]}</span>
              </figcaption>
            </figure>
          </header>
          <div className="pm-body">
            {groups.map((g, s) => (
              <section className="pm-sec" key={s}>
                {named && (
                  <h2>
                    {g.cat || "Món khác"}
                    {sectionKnown(g.cat) && sectionName(g.cat, lang) !== g.cat && <span lang={lang}> · {sectionName(g.cat, lang)}</span>}
                  </h2>
                )}
                {g.idx.map((i) => item(menu.dishes[i], i))}
              </section>
            ))}
          </div>
          <footer className="pm-foot">
            <span>{url.replace(/^https?:\/\//, "")}</span>
            <span>Quán · thực đơn QR 4 thứ tiếng</span>
          </footer>
        </article>
      </div>
    </main>
  );
}
