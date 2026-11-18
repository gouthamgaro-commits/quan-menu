import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RatingLine, ReviewCard } from "@/components/Reviews";
import { getSettings, listReviews, reviewSummary } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const [s, summary] = await Promise.all([getSettings(), reviewSummary()]);
  return {
    title: `Reviews · ${s.brandName}`,
    description:
      summary.count > 0
        ? `${summary.count} reviews from students who got their project from ${s.brandName}, rated ${summary.avg.toFixed(1)} out of 5. Every review comes from a delivered order.`
        : `Reviews from students who got their project from ${s.brandName}. Every review comes from a delivered order.`,
    alternates: { canonical: "/reviews" },
  };
}

export default async function ReviewsPage() {
  const [s, reviews, summary] = await Promise.all([getSettings(), listReviews({ status: "approved", limit: 200 }), reviewSummary()]);

  return (
    <main className="container page stack">
      <div className="page-hero stack">
        <span className="deco-emoji" aria-hidden>
          ⭐
        </span>
        <div className="stack-sm">
          <span className="sticker white">real ones only</span>
          <h1>what students say</h1>
          <p className="lead">Every review here comes from a delivered order, and we never edit what students write.</p>
          {summary.count > 0 && <RatingLine avg={summary.avg} count={summary.count} />}
        </div>
      </div>
      <div className="stack">
        {reviews.length > 0 ? (
          <div className="review-grid">
            {reviews.map((r) => (
              <ReviewCard key={r.id} r={r} brand={s.brandName} showProject />
            ))}
          </div>
        ) : (
          <div className="card card-pad empty stack-sm">
            <span style={{ fontSize: 44 }} aria-hidden>
              🌱
            </span>
            <h2>no reviews yet, we&apos;re fresh</h2>
            <p className="muted">The first students are getting their projects right now. Their reviews will show up here.</p>
            <div>
              <Link href="/projects" className="btn btn-primary">
                browse projects <ArrowRight size={17} aria-hidden />
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
