import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import type { Review } from "@/lib/types";

const monthFmt = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** ★★★★☆ with the number for screen readers. */
export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  const full = Math.round(rating);
  return (
    <span className="stars" style={{ fontSize: size }} role="img" aria-label={`${rating} out of 5 stars`}>
      {"★★★★★".slice(0, full)}
      <span className="stars-off">{"★★★★★".slice(0, 5 - full)}</span>
    </span>
  );
}

/** "★ 4.8 · 12 reviews" */
export function RatingLine({ avg, count, href }: { avg: number; count: number; href?: string }) {
  if (!count) return null;
  const inner = (
    <>
      <Stars rating={avg} size={15} /> <b>{avg.toFixed(1)}</b> · {count} {count === 1 ? "review" : "reviews"}
    </>
  );
  return href ? (
    <Link href={href} className="rating-line">
      {inner}
    </Link>
  ) : (
    <span className="rating-line">{inner}</span>
  );
}

/** One published review: stars, words, who wrote it, and the owner's reply. */
export function ReviewCard({ r, brand, showProject = false }: { r: Review; brand: string; showProject?: boolean }) {
  return (
    <article className="review-card">
      <div className="row between">
        <Stars rating={r.rating} />
        <span className="tiny muted">{monthFmt.format(new Date(r.createdAt))}</span>
      </div>
      {r.body && <p className="review-body">“{r.body}”</p>}
      <div className="review-who">
        <b>{r.name || "A student"}</b>
        {r.context && <span className="muted small"> · {r.context}</span>}
      </div>
      <div className="row" style={{ gap: 6 }}>
        <span className="verified">
          <BadgeCheck size={14} aria-hidden /> verified order
        </span>
        {showProject && r.title && (
          <span className="small muted">
            for{" "}
            {r.projectSlug ? <Link href={`/projects/${r.projectSlug}`}>{r.title}</Link> : <i>{r.title}</i>}
          </span>
        )}
      </div>
      {r.reply && (
        <p className="review-reply small">
          <b>{brand} replied:</b> {r.reply}
        </p>
      )}
    </article>
  );
}
