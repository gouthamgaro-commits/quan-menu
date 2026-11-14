import { ArrowRight, Check, ChevronRight, Clock, GraduationCap, Layers } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryIcon, WhatsAppIcon } from "@/components/Icons";
import { Meter, ProjectCard } from "@/components/Ui";
import { INCLUDES, branchName, categoryName, difficultyName, levelName, type IncludeId } from "@/lib/catalog";
import { getProjectBySlug, getSettings, relatedProjects } from "@/lib/data";
import { inr } from "@/lib/format";
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
    description: `${p.summary} ${levelName(p.level)}, ${difficultyName(p.difficulty).toLowerCase()} difficulty, ${inr(p.price)}. Includes ${p.includes
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
  const [s, related, base] = await Promise.all([getSettings(), relatedProjects(p), siteUrl()]);
  const advance = advanceFor(p.price, s.advancePercent);
  const wa = s.whatsapp
    ? waLink(s.whatsapp, `Hi ${s.brandName}! I'm interested in “${p.title}” (${inr(p.price)}). ${base}/projects/${p.slug}`)
    : "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.summary,
    category: categoryName(p.category),
    brand: { "@type": "Brand", name: s.brandName },
    offers: { "@type": "Offer", price: p.price, priceCurrency: "INR", availability: "https://schema.org/InStock", url: `${base}/projects/${p.slug}` },
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
            <div className="row">
              <span className="cat-icon lg">
                <CategoryIcon category={p.category} size={26} />
              </span>
              <div className="stack-xs">
                <span className="pcard-cat">{categoryName(p.category)}</span>
                <span className="small muted">{levelName(p.level)}</span>
              </div>
            </div>
            <h1 style={{ fontSize: "clamp(24px, 4.4vw, 34px)" }}>{p.title}</h1>
            <p className="lead">{p.summary}</p>
            <div className="row">
              <Meter level={p.difficulty} />
              <span className="days">
                <Clock size={14} aria-hidden /> Ready in {p.deliveryDays} days
              </span>
            </div>
            <div className="chips">
              {p.branches.map((b) => (
                <Link key={b} href={`/projects?branch=${b}`} className="chip" style={{ textDecoration: "none" }}>
                  {branchName(b)}
                </Link>
              ))}
            </div>
          </section>

          <section className="card card-pad stack">
            <h2 style={{ fontSize: 20 }}>About this project</h2>
            <div className="prose">
              {p.description.split(/\n{2,}/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            {p.features.length > 0 && (
              <>
                <h3>Key features</h3>
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
              <h2 style={{ fontSize: 20 }}>Built with</h2>
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
            <h2 style={{ fontSize: 20 }}>What you get</h2>
            <ul className="checklist cols">
              {p.includes.map((i) => (
                <li key={i}>
                  <Check size={18} aria-hidden /> {INCLUDES[i as IncludeId] ?? i}
                </li>
              ))}
            </ul>
            <p className="small muted">Need a feature added or a different technology? Write it in the notes when you order and we'll confirm the price.</p>
          </section>
        </div>

        <aside className="detail-side stack">
          <div className="card pricebox">
            <div className="stack-xs">
              <span className="price-lg">{inr(p.price)}</span>
              <span className="small muted">
                Pay {inr(advance)} ({s.advancePercent}%) to start, the rest after the demo
              </span>
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
              Order this project <ArrowRight size={18} aria-hidden />
            </Link>
            {wa && (
              <a href={wa} className="btn btn-wa btn-block" target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon /> Ask a question
              </a>
            )}
          </div>
          <div className="card card-pad stack-sm">
            <b>How ordering works</b>
            <ol className="small muted" style={{ paddingLeft: 18, display: "grid", gap: 6, margin: 0 }}>
              <li>Place your order and pay the {s.advancePercent}% advance by UPI.</li>
              <li>We build it and keep you posted on WhatsApp.</li>
              <li>See the working demo, pay the rest, and download everything.</li>
            </ol>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="stack">
          <h2>Similar projects</h2>
          <div className="pgrid three">
            {related.map((r) => (
              <ProjectCard key={r.id} p={r} />
            ))}
          </div>
        </section>
      )}

      <div className="sticky-buy">
        <span className="stack-xs grow">
          <b className="price">{inr(p.price)}</b>
          <span className="tiny muted">{inr(advance)} to start</span>
        </span>
        <Link href={`/projects/${p.slug}/order`} className="btn btn-primary">
          Order now
        </Link>
      </div>
    </main>
  );
}
