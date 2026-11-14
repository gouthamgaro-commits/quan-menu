import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  Building2,
  Check,
  CodeXml,
  Cog,
  Cpu,
  FileCode2,
  FileText,
  Laptop,
  MessageCircleQuestion,
  MonitorSmartphone,
  Package,
  Presentation,
  Video,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { WhatsAppIcon } from "@/components/Icons";
import { Meter, ProjectCard } from "@/components/Ui";
import { BRANCHES, DIFFICULTIES } from "@/lib/catalog";
import { branchCounts, countProjects, getSettings, listProjects } from "@/lib/data";
import { inr } from "@/lib/format";
import { waLink } from "@/lib/links";
import { estimateIdea, todayIST } from "@/lib/pricing";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: `${s.brandName} · ${s.tagline}`,
    description: `Final-year and mini projects for CSE, IT, AI & DS, ECE, EEE, Mechanical and Civil students, with source code, report, PPT and viva support. Or send your own idea and get a price in 30 seconds.`,
    alternates: { canonical: "/" },
  };
}

const BRANCH_ICONS = { cse: CodeXml, it: MonitorSmartphone, aiml: BrainCircuit, ece: Cpu, eee: Zap, mech: Cog, civil: Building2 };

export default async function Home() {
  const [s, featured, counts, total] = await Promise.all([
    getSettings(),
    listProjects({ limit: 8 }),
    branchCounts(),
    countProjects(),
  ]);
  const example = estimateIdea(s, { difficulty: 2, category: "iot", addons: [] }, todayIST());
  const wa = s.whatsapp ? waLink(s.whatsapp, `Hi ${s.brandName}! I need help choosing a project.`) : "";

  return (
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div className="stack">
            <span className="eyebrow">CSE · IT · AI & DS · ECE · EEE · Mech · Civil</span>
            <h1>
              Your engineering project, <span>ready on time.</span>
            </h1>
            <p className="lead">
              Choose from {total > 10 ? `${Math.floor(total / 5) * 5}+` : total} ready projects with source code, report and PPT, or tell us
              your own idea and see the price in 30 seconds.
            </p>
            <div className="row hero-ctas">
              <Link href="/projects" className="btn btn-primary btn-lg">
                Browse projects <ArrowRight size={18} aria-hidden />
              </Link>
              <Link href="/custom" className="btn btn-lg">
                Price my own idea
              </Link>
            </div>
            <ul className="hero-points">
              <li><Check size={16} aria-hidden /> Code, report & PPT</li>
              <li><Check size={16} aria-hidden /> Pay {s.advancePercent}% to start</li>
              <li><Check size={16} aria-hidden /> Viva questions included</li>
              <li><Check size={16} aria-hidden /> Setup on your laptop</li>
            </ul>
          </div>
          <div className="hero-visual" aria-hidden>
            <div className="card est-demo">
              <span className="eyebrow">Price my idea</span>
              <b>“IoT smart parking with a mobile app”</b>
              <div className="row">
                <span className="chip">IoT & embedded</span>
                <Meter level={2} />
              </div>
              <span className="range">
                {inr(example.low)} – {inr(example.high)}
              </span>
              <span className="small muted">Instant estimate · final price confirmed on WhatsApp</span>
            </div>
            {featured[0] && <ProjectCard p={featured[0]} />}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div className="stack-xs">
              <h2>Find projects for your branch</h2>
              <p>Every project comes with what your college asks for.</p>
            </div>
          </div>
          <div className="branches">
            {BRANCHES.map((b) => {
              const Icon = BRANCH_ICONS[b.id];
              return (
                <Link key={b.id} href={`/projects?branch=${b.id}`} className="branch-tile">
                  <Icon size={22} aria-hidden color="var(--brand)" />
                  <b>{b.short}</b>
                  <small>{counts[b.id] ?? 0} projects</small>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <div className="stack-xs">
                <h2>Popular projects</h2>
                <p>Ready to start today, with fixed prices.</p>
              </div>
              <Link href="/projects" className="btn btn-ghost">
                See all projects <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
            <div className="pgrid four">
              {featured.map((p) => (
                <ProjectCard key={p.id} p={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section" style={{ background: "var(--surface)", borderBlock: "1px solid var(--line)" }}>
        <div className="container">
          <div className="section-head">
            <h2>How it works</h2>
          </div>
          <div className="steps">
            <div className="card step">
              <span className="num">1</span>
              <h3>Choose or describe</h3>
              <p>Pick a ready project, or tell us your own idea with your deadline.</p>
            </div>
            <div className="card step">
              <span className="num">2</span>
              <h3>See the price</h3>
              <p>Ready projects have a fixed price. Your own idea gets an instant estimate, confirmed on WhatsApp.</p>
            </div>
            <div className="card step">
              <span className="num">3</span>
              <h3>Pay {s.advancePercent}% to start</h3>
              <p>Pay the advance by UPI from any app. We start work and keep you posted.</p>
            </div>
            <div className="card step">
              <span className="num">4</span>
              <h3>Get it, understand it</h3>
              <p>See the demo, pay the rest, and download code, report and PPT. We help you prepare for the viva.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="container">
          <div className="section-head">
            <div className="stack-xs">
              <h2>Prices by difficulty</h2>
              <p>The harder the project, the more it costs. Starting prices for software projects:</p>
            </div>
            <Link href="/custom" className="btn btn-soft">
              Get an exact estimate <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
          <div className="tiers">
            {DIFFICULTIES.map((d) => (
              <div key={d.level} className="card tier" data-level={d.level}>
                <Meter level={d.level} />
                <span className="from">from</span>
                <span className="price-lg">{inr(s.tierPrices[d.level - 1])}</span>
                <p>{d.hint}</p>
              </div>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 12 }}>
            AI, hardware and fabrication projects cost more, because of model training time and components. Hardware kits are
            assembled, tested and included in the price.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <h2>What you get</h2>
          </div>
          <div className="gets">
            <div className="card get"><FileCode2 size={22} aria-hidden /> Full source code</div>
            <div className="card get"><FileText size={22} aria-hidden /> Project report</div>
            <div className="card get"><Presentation size={22} aria-hidden /> PPT slides</div>
            <div className="card get"><Video size={22} aria-hidden /> Demo video</div>
            <div className="card get"><Laptop size={22} aria-hidden /> Setup on your laptop</div>
            <div className="card get"><MessageCircleQuestion size={22} aria-hidden /> Viva Q&A</div>
            <div className="card get"><Package size={22} aria-hidden /> Hardware kits, tested</div>
            <div className="card get"><BadgeCheck size={22} aria-hidden /> Free small changes</div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container narrow">
          <div className="section-head">
            <h2>Questions students ask</h2>
          </div>
          <div className="faq">
            <details>
              <summary>How do I pay?</summary>
              <p>
                By UPI from GPay, PhonePe, Paytm or any bank app. You pay {s.advancePercent}% to start, and the rest after
                you have seen the working demo. Your order page shows the exact amount and a QR code.
              </p>
            </details>
            <details>
              <summary>How long does it take?</summary>
              <p>
                Most software projects take 4–10 days; hardware and fabrication projects 7–15 days. Every project page
                shows its delivery time. Tell us your deadline when you order.
              </p>
            </details>
            <details>
              <summary>Will you explain how the project works?</summary>
              <p>
                Yes. You get the report, slides and a list of viva questions with answers, and we walk you through the
                project after delivery. You can also book a 1-on-1 explanation call.
              </p>
            </details>
            <details>
              <summary>Can I change a ready-made project?</summary>
              <p>
                Yes. Write the changes in the notes when you order and we confirm the price on WhatsApp. Small changes
                after delivery, like names and screenshots in the report, are free.
              </p>
            </details>
            <details>
              <summary>I have my own idea. Can you build it?</summary>
              <p>
                Yes. Use “Price my idea”: describe it, pick how hard it is and your deadline, and you see an estimate at
                once. We confirm the final price on WhatsApp, usually within a few hours.
              </p>
            </details>
            <details>
              <summary>Do you make hardware projects?</summary>
              <p>
                Yes: IoT, embedded, robotics, electrical and mechanical working models. The kit comes assembled and tested,
                with the circuit diagram and code.
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="cta-band">
            <div className="stack-sm">
              <h2>Have your own project idea?</h2>
              <p>Describe it in a few lines and see the price in 30 seconds. No payment needed to ask.</p>
            </div>
            <div className="row">
              <Link href="/custom" className="btn btn-lg" style={{ background: "#fff", color: "#2f3fd6" }}>
                Price my idea <ArrowRight size={18} aria-hidden />
              </Link>
              {wa && (
                <a href={wa} className="btn btn-wa btn-lg" target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon /> Ask on WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
