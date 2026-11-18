"use client";
import { useEffect, useRef } from "react";
import { BRANCHES, YEARS } from "@/lib/catalog";

const KEY = "ps_contact";
const SAVED = ["name", "phone", "email", "college", "branch", "year"];

/** Name, WhatsApp number, college… Remembered on this phone so the next order is quicker. */
export default function ContactFields({ defaultBranch = "" }: { defaultBranch?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, unknown>;
      for (const name of SAVED) {
        const el = ref.current?.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`);
        const v = saved[name];
        if (el && !el.value && typeof v === "string") el.value = v;
      }
    } catch {
      /* storage unavailable: nothing to fill */
    }
  }, []);

  const remember = () => {
    try {
      const data: Record<string, string> = {};
      for (const name of SAVED) {
        const el = ref.current?.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`);
        if (el) data[name] = el.value;
      }
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* private mode: skip */
    }
  };

  return (
    <div ref={ref} className="stack" onChange={remember}>
      <div className="grid-2">
        <label className="field">
          <span>your name</span>
          <input className="input" name="name" required minLength={2} maxLength={80} autoComplete="name" placeholder="Alex / Priya / Sam" />
        </label>
        <label className="field">
          <span>WhatsApp number</span>
          <input
            className="input"
            name="phone"
            type="tel"
            inputMode="tel"
            required
            minLength={10}
            maxLength={18}
            autoComplete="tel"
            placeholder="98765 43210 or +1 555 123 4567"
          />
          <span className="hint">Outside India? Add your country code. We send updates here.</span>
        </label>
      </div>
      <div className="grid-2">
        <label className="field">
          <span>
            email <em>(optional)</em>
          </span>
          <input className="input" name="email" type="email" maxLength={120} autoComplete="email" placeholder="you@example.com" />
        </label>
        <label className="field">
          <span>college / bootcamp</span>
          <input className="input" name="college" maxLength={120} autoComplete="organization" placeholder="where you study" />
        </label>
      </div>
      <div className="grid-3">
        <label className="field">
          <span>field</span>
          <select className="select" name="branch" defaultValue={defaultBranch}>
            <option value="">Select…</option>
            {BRANCHES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>year / stage</span>
          <select className="select" name="year" defaultValue="">
            <option value="">Select…</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>team size</span>
          <select className="select" name="team" defaultValue="1">
            <option value="1">just me</option>
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} people
              </option>
            ))}
          </select>
        </label>
      </div>
      {/* Bots fill every field; people never see this one. */}
      <label className="honey" aria-hidden>
        Website <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
