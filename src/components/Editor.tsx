"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveMenu, signOut } from "@/app/dashboard/actions";
import { DEMO_KEY, slugify } from "@/lib/config";
import { EXAMPLE_MENU } from "@/lib/demo";
import { ALLERGENS } from "@/lib/i18n";
import { ALLERGEN_KEYS, isTranslated, type Dish, type MenuData } from "@/lib/types";
import MenuView from "./MenuView";
import Sticker from "./Sticker";

interface Props {
  initial: MenuData | null;
  demo: boolean;
  siteUrl: string;
  email?: string;
}

const blank = (): Dish => ({ vi: "", price: 0, spice: 0, alg: [], pron: "", name: null, desc: null });

/** Shrinks a phone photo to ≤1600px JPEG so uploads stay small and fast. */
async function shrink(file: File): Promise<{ data: string; type: "image/jpeg" }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return { data: c.toDataURL("image/jpeg", 0.85).split(",")[1], type: "image/jpeg" };
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Something went wrong. Try again.");
  return json as T;
}

type Status = { msg: string; kind?: "err" | "good" };

export default function Editor({ initial, demo, siteUrl, email }: Props) {
  const router = useRouter();
  const start = initial ?? { name: "", area: "", slug: "", published: false, dishes: [] };
  const [name, setName] = useState(start.name);
  const [area, setArea] = useState(start.area);
  const [slug, setSlug] = useState(start.slug);
  const [slugTouched, setSlugTouched] = useState(!!start.slug);
  const [published, setPublished] = useState(start.published);
  const [dishes, setDishes] = useState<Dish[]>(start.dishes);
  const [savedSlug, setSavedSlug] = useState(start.slug);
  const [dirty, setDirty] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [thumb, setThumb] = useState("");
  const [busy, setBusy] = useState<"" | "read" | "translate" | "save">("");
  const [s1, setS1] = useState<Status>({ msg: "" });
  const [s2, setS2] = useState<Status>({ msg: "" });
  const [s4, setS4] = useState<Status>({ msg: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  // Demo mode: the menu lives in this browser.
  useEffect(() => {
    if (!demo) return;
    try {
      const s = JSON.parse(localStorage.getItem(DEMO_KEY) || "null") as MenuData | null;
      if (s?.dishes) {
        setName(s.name); setArea(s.area); setSlug(s.slug); setSlugTouched(true);
        setPublished(s.published); setDishes(s.dishes); setSavedSlug(s.slug);
      }
    } catch {}
  }, [demo]);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const touch = () => setDirty(true);
  const update = (i: number, patch: Partial<Dish>) => {
    setDishes((ds) => ds.map((d, k) => (k === i ? { ...d, ...patch } : d)));
    touch();
  };
  const renameVi = (i: number, vi: string) => {
    const d = dishes[i];
    if (vi.trim() === d.vi) return;
    // A new Vietnamese name means the old translation is wrong.
    update(i, { vi: vi.trim(), name: null, desc: null, pron: "", alg: [], spice: 0 });
  };

  const base = siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const liveSlug = slugify(slug || name);
  const publicUrl = `${base}/m/${demo ? liveSlug : savedSlug || liveSlug}`;
  const needTranslate = dishes.filter((d) => d.vi && !isTranslated(d)).length;

  async function readPhoto() {
    if (!photo) return;
    setBusy("read");
    setS1({ msg: "Reading the menu… this usually takes 20–60 seconds." });
    try {
      const img = await shrink(photo);
      const out = await post<{ stall: string; dishes: Dish[] }>("/api/extract", { image: img.data, type: img.type });
      setDishes(out.dishes);
      if (out.stall && !name) setName(out.stall);
      touch();
      setS1({ msg: `Found ${out.dishes.length} dishes. Check them in step 2.`, kind: "good" });
    } catch (e) {
      setS1({ msg: (e as Error).message, kind: "err" });
    } finally {
      setBusy("");
    }
  }

  async function translate() {
    const idx = dishes.map((d, i) => (d.vi && !isTranslated(d) ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) return;
    setBusy("translate");
    setS2({ msg: `Translating ${idx.length} dish${idx.length > 1 ? "es" : ""}…` });
    try {
      const out = await post<{ dishes: (Dish | null)[] }>("/api/translate", { names: idx.map((i) => dishes[i].vi) });
      setDishes((ds) =>
        ds.map((d, i) => {
          const k = idx.indexOf(i);
          const t = k >= 0 ? out.dishes[k] : null;
          return t ? { ...t, vi: d.vi, price: d.price } : d;
        }),
      );
      touch();
      setS2({ msg: "Done. Check the allergens are right for your recipe.", kind: "good" });
    } catch (e) {
      setS2({ msg: (e as Error).message, kind: "err" });
    } finally {
      setBusy("");
    }
  }

  async function save() {
    const clean = dishes.filter((d) => d.vi.trim());
    if (!name.trim()) return setS4({ msg: "Add your stall's name in step 1.", kind: "err" });
    setBusy("save");
    setS4({ msg: "Saving…" });
    try {
      if (demo) {
        const data: MenuData = { name, area, slug: liveSlug, published, dishes: clean };
        localStorage.setItem(DEMO_KEY, JSON.stringify(data));
        setSavedSlug(liveSlug);
        setDirty(false);
        setS4({ msg: "Saved in this browser (demo mode).", kind: "good" });
      } else {
        const r = await saveMenu({ name, area, slug: liveSlug, published, dishes: clean });
        if (!r.ok) return setS4({ msg: r.error || "Couldn't save.", kind: "err" });
        setSavedSlug(r.slug!);
        setSlug(r.slug!);
        setDirty(false);
        setS4({ msg: published ? "Saved. Your menu is live." : "Saved as a draft. Turn on “Menu is live” when you're ready.", kind: "good" });
        router.refresh();
      }
      setDishes(clean);
    } catch {
      setS4({ msg: "Couldn't save. Check your connection and try again.", kind: "err" });
    } finally {
      setBusy("");
    }
  }

  function loadExample() {
    setName(EXAMPLE_MENU.name); setArea(EXAMPLE_MENU.area); setSlugTouched(false);
    setDishes(structuredClone(EXAMPLE_MENU.dishes)); touch();
    setS2({ msg: "Example menu loaded. Replace it with your own dishes." });
  }

  return (
    <main className="page">
      <div className="wrap">
        <header className="top">
          <a className="logo" href="/">Quán<span>.</span></a>
          <div className="row">
            {demo ? <span className="pill warn">Demo mode</span> : <span className={"pill " + (published ? "ok" : "")}>{published ? "Live" : "Draft"}</span>}
            {dirty && <span className="pill warn">Unsaved changes</span>}
            {email && (
              <form action={async () => { await signOut(); router.push("/"); }}>
                <button className="btn" type="submit" title={email}>Sign out</button>
              </form>
            )}
          </div>
        </header>

        <div className="grid">
          <div className="steps">
            <section className="step" aria-labelledby="s1">
              <div className="step-h"><div className="num">1</div><div><h2 id="s1">Your stall and menu photo</h2><small>The board on the wall, a printed sheet, or handwriting all work.</small></div></div>
              <div className="two">
                <label className="f" htmlFor="name">Stall name
                  <input id="name" type="text" value={name} placeholder="Cơm Tấm Cô Ba" onChange={(e) => { setName(e.target.value); touch(); }} />
                </label>
                <label className="f" htmlFor="area">Street / district
                  <input id="area" type="text" value={area} placeholder="Nguyễn Trãi, Quận 1" onChange={(e) => { setArea(e.target.value); touch(); }} />
                </label>
              </div>
              <button className="drop" type="button" onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setPhoto(f); setThumb(URL.createObjectURL(f)); } }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {thumb && <img src={thumb} alt="" />}
                <div><b>{photo ? photo.name : "Choose a menu photo"}</b><span>{photo ? "Choose a different photo" : "Take a photo or pick one. JPG, PNG or WebP."}</span></div>
              </button>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPhoto(f); setThumb(URL.createObjectURL(f)); } }} />
              <div className="row">
                <button className="btn primary" disabled={!photo || !!busy} onClick={readPhoto}>{busy === "read" ? "Reading…" : "Read menu with AI"}</button>
                {dishes.length > 0 && photo && <small className="status">This replaces the dishes in step 2.</small>}
              </div>
              <p className={"status " + (s1.kind ?? "")} aria-live="polite">{s1.msg}</p>
            </section>

            <section className="step" aria-labelledby="s2">
              <div className="step-h"><div className="num">2</div><div><h2 id="s2">Check dishes and prices</h2><small>Fix anything the photo got wrong. Open a dish to correct allergens.</small></div></div>
              <div className="dlist">
                <div className="drow dhead"><span>Dish (Vietnamese)</span><span style={{ textAlign: "right" }}>Price ₫</span><span className="encol">English</span><span /><span /></div>
                {!dishes.length && <div className="empty">No dishes yet. Read a photo in step 1, add one by hand, or <button className="icon" onClick={loadExample} style={{ color: "var(--stool)", textDecoration: "underline" }}>load the example menu</button>.</div>}
                {dishes.map((d, i) => (
                  <div className="drow" key={i}>
                    <input type="text" aria-label="Vietnamese name" defaultValue={d.vi} key={"vi" + i + d.vi} id={"vi" + i}
                      onBlur={(e) => renameVi(i, e.target.value)} />
                    <input className="price" type="number" min={0} step={1000} aria-label="Price in đồng" value={d.price || ""}
                      onChange={(e) => update(i, { price: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
                    <span className="encol">{isTranslated(d) ? <span className="en">{d.name!.en}</span> : <span className="pending">Needs translation</span>}</span>
                    <button className="icon" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>{open === i ? "Close" : "Edit"}</button>
                    <button className="icon del" aria-label={`Remove ${d.vi || "dish"}`} onClick={() => { setDishes((ds) => ds.filter((_, k) => k !== i)); setOpen(null); touch(); }}>✕</button>
                    {open === i && (
                      <div className="details">
                        <div className="two">
                          <label className="f">English name
                            <input type="text" value={d.name?.en ?? ""} placeholder="Translate first, or type it"
                              onChange={(e) => update(i, { name: { en: e.target.value, ko: d.name?.ko ?? "", zh: d.name?.zh ?? "", ja: d.name?.ja ?? "" } })} />
                          </label>
                          <label className="f">Spice level
                            <select value={d.spice} onChange={(e) => update(i, { spice: Number(e.target.value) })}>
                              <option value={0}>Not spicy</option><option value={1}>A little</option><option value={2}>Medium</option><option value={3}>Very spicy</option>
                            </select>
                          </label>
                        </div>
                        <label className="f">How to say it
                          <input type="text" value={d.pron} placeholder="e.g. fuh baw tie" onChange={(e) => update(i, { pron: e.target.value })} />
                        </label>
                        <div className="f" style={{ display: "grid", gap: 6 }}>
                          <span className="f">Contains</span>
                          <div className="chips">
                            {ALLERGEN_KEYS.map((a) => {
                              const on = d.alg.includes(a);
                              return (
                                <button key={a} className="chip" aria-pressed={on}
                                  onClick={() => update(i, { alg: on ? d.alg.filter((x) => x !== a) : [...d.alg, a] })}>
                                  {ALLERGENS[a].en}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="row">
                <button className="btn" onClick={() => { setDishes((ds) => [...ds, blank()]); touch(); setTimeout(() => document.getElementById("vi" + dishes.length)?.focus(), 0); }}>Add a dish</button>
                {needTranslate > 0 && <button className="btn primary" disabled={!!busy} onClick={translate}>{busy === "translate" ? "Translating…" : `Translate ${needTranslate} new dish${needTranslate > 1 ? "es" : ""}`}</button>}
              </div>
              <p className={"status " + (s2.kind ?? "")} aria-live="polite">{s2.msg}</p>
            </section>

            <section className="step" aria-labelledby="s3">
              <div className="step-h"><div className="num">3</div><div><h2 id="s3">Publish</h2><small>Customers only see the menu after you save with “Menu is live” on.</small></div></div>
              <label className="f" htmlFor="slug">Web address
                <input id="slug" type="text" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); touch(); }}
                  onBlur={() => setSlug(slugify(slug || name))} />
              </label>
              <label className="row" style={{ gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={published} onChange={(e) => { setPublished(e.target.checked); touch(); }} />
                <span><b>Menu is live</b> — anyone who scans the code can see it</span>
              </label>
              <div className="row">
                <button className="btn primary" disabled={!!busy || (!dirty && !!savedSlug)} onClick={save}>{busy === "save" ? "Saving…" : dirty || !savedSlug ? "Save menu" : "Saved"}</button>
                {savedSlug && (published || demo) && <a className="btn" href={`/m/${savedSlug}`} target="_blank" rel="noreferrer">Open public menu ↗</a>}
              </div>
              <p className={"status " + (s4.kind ?? "")} aria-live="polite">{s4.msg}</p>
            </section>

            <section className="step" aria-labelledby="s4">
              <div className="step-h"><div className="num">4</div><div><h2 id="s4">Print the QR sticker</h2><small>Stick it on the table or the cart. Price changes show up without reprinting.</small></div></div>
              {savedSlug ? (
                <Sticker name={name} url={publicUrl} slug={savedSlug} />
              ) : (
                <p className="status">Save your menu first to get its QR code.</p>
              )}
              {savedSlug && liveSlug !== savedSlug && !demo && <p className="status err">You changed the web address. Save first, or the printed code will point to the old one.</p>}
            </section>
          </div>

          <aside className="phone-col" aria-label="Customer view preview">
            <div className="phone-cap"><span>What customers see</span><span>{dishes.length} dishes</span></div>
            <div className="phone">
              <MenuView name={name} area={area} dishes={dishes.filter((d) => d.vi)} />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
