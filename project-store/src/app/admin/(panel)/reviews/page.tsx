import { Check, EyeOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { reviewReplyAction, reviewStatusAction } from "@/app/admin/actions";
import ActionForm from "@/components/admin/ActionForm";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Stars } from "@/components/Reviews";
import { requireAdmin } from "@/lib/admin";
import { listReviews, reviewSummary } from "@/lib/data";
import { dateTimeIN } from "@/lib/format";
import type { Review } from "@/lib/types";

const TABS = [
  { id: "pending", label: "To approve" },
  { id: "approved", label: "Live" },
  { id: "hidden", label: "Hidden" },
] as const;

function StatusButton({ r, verdict, children, primary = false }: { r: Review; verdict: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <form action={reviewStatusAction}>
      <input type="hidden" name="id" value={r.id} />
      <input type="hidden" name="verdict" value={verdict} />
      <button className={`btn btn-sm ${primary ? "btn-primary" : ""}`} type="submit">
        {children}
      </button>
    </form>
  );
}

export default async function ReviewsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const wanted = (await searchParams).tab;
  const tab = TABS.find((t) => t.id === wanted)?.id ?? "pending";
  const [reviews, summary] = await Promise.all([listReviews({ status: tab, limit: 200 }), reviewSummary()]);

  return (
    <>
      <div className="stack-xs">
        <h1 style={{ fontSize: 28 }}>Reviews</h1>
        <p className="muted">
          Students review their project once it&apos;s delivered. Nothing shows on the site until you approve it.
          {summary.count > 0 && ` Live now: ${summary.count} reviews, ${summary.avg.toFixed(1)} stars on average.`}
        </p>
      </div>
      <nav className="tabs" aria-label="Review status">
        {TABS.map((t) => (
          <Link key={t.id} href={`/admin/reviews?tab=${t.id}`} aria-current={t.id === tab ? "page" : undefined} className="chip">
            {t.label}
          </Link>
        ))}
      </nav>
      {reviews.length === 0 ? (
        <p className="muted">
          {tab === "pending"
            ? "Nothing to approve. Ask happy students for a review: on a delivered order, use “Ask for a review” in the WhatsApp templates."
            : "No reviews here yet."}
        </p>
      ) : (
        <div className="stack">
          {reviews.map((r) => (
            <section key={r.id} className="card card-pad stack-sm">
              <div className="row between top">
                <div className="stack-xs">
                  <Stars rating={r.rating} />
                  <span className="small">
                    <b>{r.name || "Student"}</b>
                    {r.context && <span className="muted"> · {r.context}</span>}
                  </span>
                </div>
                <span className="tiny muted">
                  <Link href={`/admin/orders/${r.orderId}`}>{r.orderCode}</Link> · {r.title} · {dateTimeIN(r.updatedAt)}
                </span>
              </div>
              <p style={{ whiteSpace: "pre-line" }}>{r.body}</p>
              <div className="row">
                {r.status !== "approved" && (
                  <StatusButton r={r} verdict="approved" primary>
                    <Check size={15} aria-hidden /> Publish
                  </StatusButton>
                )}
                {r.status !== "hidden" && (
                  <StatusButton r={r} verdict="hidden">
                    <EyeOff size={15} aria-hidden /> Hide
                  </StatusButton>
                )}
                <form action={reviewStatusAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="verdict" value="delete" />
                  <ConfirmButton message="Delete this review for good?" className="btn btn-ghost btn-sm">
                    <Trash2 size={15} aria-hidden /> Delete
                  </ConfirmButton>
                </form>
              </div>
              <details>
                <summary className="small strong" style={{ cursor: "pointer" }}>
                  {r.reply ? "Edit your public reply" : "Reply publicly (optional)"}
                </summary>
                <ActionForm action={reviewReplyAction} submit="Save reply" className="stack-sm" buttonClass="btn btn-sm">
                  <input type="hidden" name="id" value={r.id} />
                  <textarea className="textarea" name="reply" rows={2} maxLength={1000} defaultValue={r.reply} placeholder="e.g. Thanks Priya, all the best for your placements! 🙌" style={{ marginTop: 8 }} />
                </ActionForm>
              </details>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
