import { ArrowRight, Check, ChevronRight, Clock, ExternalLink, GraduationCap, HandCoins, Layers, MonitorPlay } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CoverArt from "@/components/CoverArt";
import DemoVideo from "@/components/DemoVideo";
import { WhatsAppIcon } from "@/components/Icons";
import { RatingLine, ReviewCard } from "@/components/Reviews";
import { Meter, ProjectCard } from "@/components/Ui";
import { INCLUDES, branchName, categoryEmoji, categoryName, difficultyName, levelName, type IncludeId } from "@/lib/catalog";
import { getProjectBySlug, getSettings, listReviews, projectRatings, relatedProjects, reviewSummary } from "@/lib/data";
import { approx, inr } from "@/lib/format";
import { getFx } from "@/lib/fx";
import { waLink } from "@/lib/links";
import { advanceFor } from "@/lib/pricing";
import { siteUrl } from "@/lib/site";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const [p, s] = await Promise.all([getProjectBySlug(slug), getSettings()]);
  if (!p || !p.active) return { title: `Project not found · ${s.brandName}` };
  const branch = p.branches[0] ? branchName(p.branches[0], true) + " " : "";
  return {
    title: `${p.title} · ${branch}project with source code · ${s.brandName}`,
    description: `${p.summary} ${levelName(p.level)}, ${difficultyName(p.difficulty).toLowerCase()} difficulty, ${inr(p.price)}${s.negotiable ? " (negotiable)" : ""}. Includes ${p.includes
      .slice(0, 4)
      .map((i) => INCLUDES[i as IncludeId]?.toLowerCase())
      .filter(Boolean)
      .join(", ")}.`,
    alternates: { canonical: `/projects/${p.slug}` },
  };
}

export default async function ProjectPage({ params }: { params: Params }) {
  const { slug } = await params;
  const p = await getProjectBySlug(slug);
  if (!p || !p.active) notFound();
  const [s, related, base, reviews, summary, ratings] = await Promise.all([
    getSettings(),
    relatedProjects(p),
    siteUrl(),
    listReviews({ status: "approved", projectId: p.id, limit: 12 }),
    reviewSummary(p.id),
    projectRatings(),
  ]);
  const fx = await getFx(s.localCurrency);
  const advance = advanceFor(p.price, s.advancePercent);
  const wa = s.whatsapp
    ? waLink(s.whatsapp, `Hey ${s.brandName}! I'm interested in “${p.title}” (${inr(p.price)}) 👀 ${base}/projects/${p.slug}`)
    : "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.summary,
    category: categoryName(p.category),
    brand: { "@type": "Brand", name: s.brandName },
    offers: { "@type": "Offer", price: p.price, priceCurrency: "INR", availability: "https://schema.org/InStock", url: `${base}/projects/${p.slug}` },
    ...(summary.count > 0
      ? {
          aggregateRating: { "@type": "AggregateRating", ratingValue: summary.avg, reviewCount: summary.count, bestRating: 5, worstRating: 1 },
          review: reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
            author: { "@type": "Person", name: r.name || "Student" },
            reviewBody: r.body,
            datePublished: new Date(r.createdAt).toISOString().slice(0, 10),
          })),
        }
      : {}),
  };

  return (
    <main className="container page stack-lg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/projects">Projects</Link>
        {p.branches[0] && (
          <>
            <ChevronRight size={14} aria-hidden />
            <Link href={`/projects?branch=${p.branches[0]}`}>{branchName(p.branches[0], true)}</Link>
          </>
        )}
        <ChevronRight size={14} aria-hidden />
        <span aria-current="page">{p.title}</span>
      </nav>

      <div className="detail">
        <div className="stack">
          <section className={`card detail-hero cat-${p.category}`}>
            <CoverArt category={p.category} seed={p.slug} tall>
              <span className="cover-tags">
                <span className="glass-chip">
                  {categoryEmoji(p.category)} {categoryName(p.category)}
                </span>
                <span className="glass-chip">
                  <Meter level={p.difficulty} />
                </span>
              </span>
            </CoverArt>
            <div className="dh-body">
              <span className="sticker lime" style={{ fontSize: 12.5 }}>
                {levelName(p.level)}
              </span>
              <h1 style={{ fontSize: "clamp(26px, 4.6vw, 40px)" }}>{p.title}</h1>
              <p className="lead">{p.summary}</p>
              <div className="row">
                <span className="days">
                  <Clock size={14} aria-hidden /> Ready in {p.deliveryDays} days
                </span>
                <div className="chips">
                  {p.branches.map((b) => (
                    <Link key={b} href={`/projects?branch=${b}`} className="chip" style={{ textDecoration: "none" }}>
                      {branchName(b, true)}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {(p.demoUrl || p.liveUrl) && (
            <section className="card card-pad stack" id="demo">
              <h2 className="card-title">
                <MonitorPlay size={20} aria-hidden /> see it working ▶
              </h2>
              {p.demoUrl && <DemoVideo url={p.demoUrl} title={p.title} />}
              {p.liveUrl && (
                <div>
                  <a href={p.liveUrl} className="btn" target="_blank" rel="noopener noreferrer nofollow">
                    try the live demo <ExternalLink size={15} aria-hidden />
                  </a>
                </div>
              )}
              <p className="small muted">Your copy is built fresh for you, with your names and any changes you ask for.</p>
            </section>
          )}

          <section className="card card-pad stack">
            <h2 className="card-title">what it does 🧐</h2>
            <div className="prose">
              {p.description.split(/\n{2,}/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            {p.features.length > 0 && (
              <>
                <h3>key features</h3>
                <ul className="checklist">
                  {p.features.map((f) => (
                    <li key={f}>
                      <Check size={18} aria-hidden /> {f}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {p.tech.length > 0 && (
            <section className="card card-pad stack-sm">
              <h2 className="card-title">tech stack 🛠️</h2>
              <div className="tags">
                {p.tech.map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="card card-pad stack">
            <h2 className="card-title">what&apos;s in the box 📦</h2>
            <ul className="checklist cols">
              {p.includes.map((i) => (
                <li key={i}>
                  <Check size={18} aria-hidden /> {INCLUDES[i as IncludeId] ?? i}
                </li>
              ))}
            </ul>
            <p className="small muted">Want a feature added or a different stack? Drop it in the notes when you order and we&apos;ll sort the price.</p>
          </section>
        </div>

        <aside className="detail-side stack">
          <div className="card pricebox">
            <div className="stack-xs">
              <div className="row between">
                <span className="price-lg">{inr(p.price)}</span>
                {s.negotiable && <span className="neg">negotiable 🤝</span>}
              </div>
              {fx && <span className="approx">{approx(p.price, fx)}</span>}
              <span className="small muted">
                Pay {s.advancePercent}% ({inr(advance)}) to start, the rest after the demo
              </span>
              {summary.count > 0 && <RatingLine avg={summary.avg} count={summary.count} href="#reviews" />}
            </div>
            <ul className="facts">
              <li>
                <Clock size={17} aria-hidden /> Ready in {p.deliveryDays} days
              </li>
              <li>
                <Layers size={17} aria-hidden /> {difficultyName(p.difficulty)} difficulty
              </li>
              <li>
                <GraduationCap size={17} aria-hidden /> {levelName(p.level)}
              </li>
            </ul>
            <Link href={`/projects/${p.slug}/order`} className="btn btn-primary btn-lg btn-block">
              lock it in 🔒 <ArrowRight size={18} aria-hidden strokeWidth={2.6} />
            </Link>
            {s.negotiable && (
              <Link href={`/projects/${p.slug}/order?offer=1`} className="btn btn-offer btn-block">
                <HandCoins size={18} aria-hidden /> make an offer 🎯
              </Link>
            )}
            {wa && (
              <a href={wa} className="btn btn-wa btn-block" target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon /> ask us anything
              </a>
            )}
          </div>
          <div className="card card-pad stack-sm">
            <b>how it works</b>
            <ol className="small" style={{ paddingLeft: 18, display: "grid", gap: 6, margin: 0 }}>
              <li>Lock it in at this price{s.negotiable ? ", or shoot your shot with an offer" : ""}.</li>
              <li>Pay the {s.advancePercent}% advance (UPI, PayPal or card). We cook 🧑‍🍳</li>
              <li>See the demo, pay the rest, download everything.</li>
            </ol>
          </div>
        </aside>
      </div>

      {reviews.length > 0 && (
        <section className="stack" id="reviews">
          <div className="row between">
            <h2>what students say ⭐</h2>
            <RatingLine avg={summary.avg} count={summary.count} />
          </div>
          <div className="review-grid">
            {reviews.map((r) => (
              <ReviewCard key={r.id} r={r} brand={s.brandName} />
            ))}
          </div>
          <Link href="/reviews" className="small">
            all reviews →
          </Link>
        </section>
      )}

      {related.length > 0 && (
        <section className="stack">
          <h2>you might also like 👇</h2>
          <div className="pgrid three">
            {related.map((r) => (
              <ProjectCard key={r.id} p={r} negotiable={s.negotiable} fx={fx} rating={ratings[r.id]} />
            ))}
          </div>
        </section>
      )}

      <div className="sticky-buy">
        <span className="stack-xs grow">
          <b className="price">{inr(p.price)}</b>
          <span className="tiny muted">{fx ? approx(p.price, fx) : s.negotiable ? "negotiable 🤝" : `${inr(advance)} to start`}</span>
        </span>
        {s.negotiable && (
          <Link href={`/projects/${p.slug}/order?offer=1`} className="btn btn-offer btn-sm">
            offer 🎯
          </Link>
        )}
        <Link href={`/projects/${p.slug}/order`} className="btn btn-primary">
          lock it in
        </Link>
      </div>
    </main>
  );
}
