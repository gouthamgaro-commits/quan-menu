"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ALLERGENS, LANGS, foreign, guessLang, vnd } from "@/lib/i18n";
import { LANG_KEYS, isTranslated, type Dish, type Lang, type Media } from "@/lib/types";

interface Props {
  name: string;
  area: string;
  dishes: Dish[];
  /** Full-page public menu (true) or the phone preview inside the dashboard (false). */
  full?: boolean;
}

function useViVoice() {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const pick = () => setVoice(speechSynthesis.getVoices().find((v) => /^vi/i.test(v.lang)) ?? null);
    pick();
    speechSynthesis.addEventListener("voiceschanged", pick);
    return () => speechSynthesis.removeEventListener("voiceschanged", pick);
  }, []);
  return voice;
}

export default function MenuView({ name, area, dishes, full }: Props) {
  const [lang, setLang] = useState<Lang>("en");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [showOrder, setShowOrder] = useState(false);
  const [viewer, setViewer] = useState<{ items: Media[]; at: number; title: string } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const voice = useViVoice();
  const L = LANGS[lang];

  useEffect(() => {
    if (full) setLang(guessLang());
  }, [full]);

  // Drop cart lines for dishes that no longer exist (the vendor edited the preview).
  useEffect(() => {
    setCart((c) => Object.fromEntries(Object.entries(c).filter(([i]) => Number(i) < dishes.length)));
  }, [dishes.length]);

  useEffect(() => {
    if (showOrder) closeRef.current?.focus();
  }, [showOrder]);

  useEffect(() => {
    if (!viewer) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewer(null);
      if (e.key === "ArrowRight") setViewer((v) => v && { ...v, at: (v.at + 1) % v.items.length });
      if (e.key === "ArrowLeft") setViewer((v) => v && { ...v, at: (v.at - 1 + v.items.length) % v.items.length });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [viewer]);

  const count = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);
  const total = useMemo(
    () => Object.entries(cart).reduce((t, [i, q]) => t + (dishes[Number(i)]?.price ?? 0) * q, 0),
    [cart, dishes],
  );

  const bump = (i: number, by: number) =>
    setCart((c) => {
      const q = Math.max(0, (c[i] ?? 0) + by);
      const next = { ...c };
      if (q) next[i] = q;
      else delete next[i];
      return next;
    });

  const speak = (text: string) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "vi-VN";
      u.rate = 0.8;
      if (voice) u.voice = voice;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch {}
  };

  return (
    <div className={"menu" + (full ? " full" : "")} lang={lang}>
      <div className="m-head">
        <div>
          <h1 className="stall">{name || "Your stall"}</h1>
          {area && <div className="meta">{area}</div>}
        </div>
        <div className="langbar" role="group" aria-label="Language">
          {LANG_KEYS.map((k) => (
            <button key={k} aria-pressed={k === lang} onClick={() => setLang(k)} lang={k}>
              {LANGS[k].label}
            </button>
          ))}
        </div>
      </div>

      <div className="m-list">
        {!dishes.length && <div className="empty">{L.empty}</div>}
        {dishes.map((d, i) => {
          const done = isTranslated(d);
          const title = done ? d.name![lang] || d.name!.en : d.vi;
          const desc = d.desc ? d.desc[lang] || d.desc.en : "";
          const q = cart[i] ?? 0;
          return (
            <div key={i} className={"dish" + (q ? " on" : "")}>
              <div className="dish-top">
                <h2 className="tn">{title}</h2>
                <div className="pr">
                  <b>{vnd(d.price)}</b>
                  <small>{foreign(d.price, lang)}</small>
                </div>
              </div>
              <div className="vn" lang="vi">
                {done && <span>{d.vi}</span>}
                <button
                  className="say"
                  onClick={() => speak(d.vi)}
                  aria-label={`${L.say}: ${d.vi}`}
                  title={voice ? undefined : "No Vietnamese voice on this device. Read the guide aloud."}
                >
                  🔊 {L.say} {d.pron && <i>“{d.pron}”</i>}
                </button>
              </div>
              {desc && <p>{desc}</p>}
              {!!d.media?.length && (
                <div className="m-media">
                  {d.media.map((m, k) => (
                    <button key={m.url} className="m-thumb" onClick={() => setViewer({ items: d.media!, at: k, title })}
                      aria-label={`${title}: ${m.type === "video" ? "video" : "photo"} ${k + 1} of ${d.media!.length}`}>
                      {m.type === "video" ? (
                        <video src={m.url + "#t=0.1"} muted playsInline preload="metadata" tabIndex={-1} />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.url} alt="" loading="lazy" />
                      )}
                      {m.type === "video" && <span className="media-play" aria-hidden>▶</span>}
                    </button>
                  ))}
                </div>
              )}
              <div className="dish-top">
                <div className="tags">
                  {d.spice > 0 && (
                    <span className="chili" title="Spicy" aria-label={`Spicy ${d.spice} of 3`}>
                      {"🌶".repeat(d.spice)}
                    </span>
                  )}
                  {d.alg.map((a) => (
                    <span key={a} className="tag">
                      {ALLERGENS[a][lang]}
                    </span>
                  ))}
                </div>
                <div className="qty">
                  <button aria-label="Remove one" disabled={!q} onClick={() => bump(i, -1)}>
                    −
                  </button>
                  <span aria-live="polite">{q}</span>
                  <button aria-label="Add one" onClick={() => bump(i, 1)}>
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="m-foot">
        <button className="btn primary" disabled={!count} onClick={() => setShowOrder(true)}>
          {count ? L.show(count) : L.show0}
        </button>
        <small>{L.note}</small>
      </div>

      {viewer && (
        <div className="viewer" role="dialog" aria-modal="true" aria-label={viewer.title} onClick={() => setViewer(null)}>
          <div className="viewer-bar" onClick={(e) => e.stopPropagation()}>
            <span>{viewer.title}{viewer.items.length > 1 && ` · ${viewer.at + 1}/${viewer.items.length}`}</span>
            <button className="btn" onClick={() => setViewer(null)} autoFocus>{L.close}</button>
          </div>
          <div className="viewer-stage" onClick={(e) => e.stopPropagation()}>
            {viewer.items[viewer.at].type === "video" ? (
              <video key={viewer.items[viewer.at].url} src={viewer.items[viewer.at].url} controls autoPlay muted playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewer.items[viewer.at].url} alt={viewer.title} />
            )}
          </div>
          {viewer.items.length > 1 && (
            <div className="viewer-nav" onClick={(e) => e.stopPropagation()}>
              <button className="btn" aria-label="Previous" onClick={() => setViewer({ ...viewer, at: (viewer.at - 1 + viewer.items.length) % viewer.items.length })}>‹</button>
              <button className="btn" aria-label="Next" onClick={() => setViewer({ ...viewer, at: (viewer.at + 1) % viewer.items.length })}>›</button>
            </div>
          )}
        </div>
      )}

      {showOrder && (
        <div className="order" role="dialog" aria-modal="true" aria-label={L.head} lang="vi">
          <h3 lang={lang}>{L.head}</h3>
          <div className="big">Cho tôi:</div>
          <ul>
            {Object.entries(cart).map(([i, q]) => {
              const d = dishes[Number(i)];
              if (!d) return null;
              return (
                <li key={i}>
                  {q} × {d.vi.replace(/\s*\(.*?\)\s*/g, " ").trim()}
                </li>
              );
            })}
          </ul>
          <div className="tot">Tổng: {vnd(total)}</div>
          <button ref={closeRef} className="btn" onClick={() => setShowOrder(false)} lang={lang}>
            {L.close}
          </button>
        </div>
      )}
    </div>
  );
}
