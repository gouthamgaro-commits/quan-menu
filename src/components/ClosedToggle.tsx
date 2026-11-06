"use client";
import { useEffect, useState } from "react";
import { addDays, isClosed, vnToday } from "@/lib/types";
import { useUi } from "./Ui";

/**
 * "Closed today" for the vendor: one tap closes the stall for today, and the date can run to a
 * later day for holidays. It opens again by itself the day after. `onSet` saves and says if it worked.
 */
export default function ClosedToggle({ until, onSet }: { until: string; onSet: (until: string | null) => Promise<boolean> }) {
  const { t, lang } = useUi();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const [today, setToday] = useState("");
  // The date box is typed into a digit at a time: only a finished day from today on is saved.
  const [pick, setPick] = useState(until);
  useEffect(() => setToday(vnToday()), []);
  useEffect(() => setPick(until), [until]);
  if (!today) return null;
  const closed = isClosed(until, today);
  const last = addDays(today, 90);

  async function set(next: string | null) {
    setBusy(true);
    setErr(false);
    const ok = await onSet(next).catch(() => false);
    setBusy(false);
    if (!ok) setErr(true);
  }

  const long = (day: string) => {
    try {
      return new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-GB", { weekday: "long", day: "numeric", month: "numeric", timeZone: "UTC" })
        .format(new Date(day + "T00:00:00Z"));
    } catch {
      return day;
    }
  };

  return (
    <div className={"closed-box" + (closed ? " on" : "")}>
      {closed ? (
        <>
          <p role="status">{t.closedNow(long(until))}</p>
          <div className="row">
            <label className="f">{t.closedThrough}
              <input type="date" value={pick} min={today} max={last} disabled={busy}
                onChange={(e) => {
                  const v = e.target.value;
                  setPick(v);
                  if (/^\d{4}-\d{2}-\d{2}$/.test(v) && v >= today && v <= last && v !== until) set(v);
                }} />
            </label>
            <button type="button" className="btn" disabled={busy} onClick={() => set(null)}>{t.reopenBtn}</button>
          </div>
        </>
      ) : (
        <div className="row">
          <span>{t.closedAsk}</span>
          <button type="button" className="btn" disabled={busy} onClick={() => set(today)}>{t.closedBtn}</button>
        </div>
      )}
      {err && <p className="status err" aria-live="polite">{t.soldOutFailed}</p>}
    </div>
  );
}
