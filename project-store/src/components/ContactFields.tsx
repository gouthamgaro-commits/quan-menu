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
          <span>Your name</span>
          <input className="input" name="name" required minLength={2} maxLength={80} autoComplete="name" placeholder="Priya Sharma" />
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
            placeholder="98765 43210"
          />
          <span className="hint">We send your price and updates here.</span>
        </label>
      </div>
      <div className="grid-2">
        <label className="field">
          <span>
            Email <em>(optional)</em>
          </span>
          <input className="input" name="email" type="email" maxLength={120} autoComplete="email" placeholder="you@example.com" />
        </label>
        <label className="field">
          <span>College</span>
          <input className="input" name="college" maxLength={120} autoComplete="organization" placeholder="Your college name" />
        </label>
      </div>
      <div className="grid-3">
        <label className="field">
          <span>Branch</span>
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
          <span>Year</span>
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
          <span>Team size</span>
          <select className="select" name="team" defaultValue="1">
            <option value="1">Just me</option>
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} students
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
