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
  HandCoins,
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
import { BRANCHES, CATEGORIES, DIFFICULTIES } from "@/lib/catalog";
import { branchCounts, countProjects, getSettings, listProjects } from "@/lib/data";
import { inr } from "@/lib/format";
import { waLink } from "@/lib/links";
import { roundTo } from "@/lib/pricing";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: `${s.brandName} · ${s.tagline}`,
    description: `Premium final-year and mini projects for CSE, IT, AI & DS, ECE, EEE, Mechanical and Civil: working code, report, PPT and viva prep.${s.negotiable ? " Every price is negotiable." : ""}`,
    alternates: { canonical: "/" },
  };
}

const BRANCH_LOOK = {
  cse: { icon: CodeXml, cat: "software" },
  it: { icon: MonitorSmartphone, cat: "security" },
  aiml: { icon: BrainCircuit, cat: "ai" },
  ece: { icon: Cpu, cat: "iot" },
  eee: { icon: Zap, cat: "electrical" },
  mech: { icon: Cog, cat: "fabrication" },
  civil: { icon: Building2, cat: "design" },
} as const;

const TECH = [
  "Python", "TensorFlow", "PyTorch", "OpenCV", "React", "Node.js", "Flutter", "Django", "Arduino", "ESP32",
  "Raspberry Pi", "MATLAB", "Simulink", "Verilog", "Xilinx Vivado", "Solidity", "LangChain", "ANSYS", "SolidWorks",
  "AutoCAD", "STAAD.Pro", "Power BI", "Firebase", "MongoDB",
];

const WORDS = ["AI & ML", "IoT", "robotics", "web app", "VLSI", "CAD", "AI & ML"];

export default async function Home() {
  const [s, featured, counts, total] = await Promise.all([getSettings(), listProjects({ limit: 8 }), branchCounts(), countProjects()]);
  const wa = s.whatsapp ? waLink(s.whatsapp, `Hi ${s.brandName}! I need help choosing a project.`) : "";
  const hero = featured.find((p) => p.category === "iot") ?? featured[0];
  // A worked example of an offer, using the hero project's real price.
  const listed = hero?.price ?? 19000;
  const offer = roundTo(listed * 0.8, 500);
  const deal = roundTo((listed + offer) / 2, 500);

  return (
    <main>
      <section className="hero">
        <div className="aurora" aria-hidden>
          <i />
          <i />
          <i />
        </div>
        <div className="gridbg" aria-hidden />
        <div className="container hero-grid">
          <div className="stack">
            <span className="live-pill">
              <span className="live-dot" aria-hidden /> Taking final-year &amp; mini projects now
            </span>
            <h1>
              Your{" "}
              <span className="rotator" aria-hidden>
                <span>
                  {WORDS.map((w, i) => (
                    <span key={i}>{w}</span>
                  ))}
                </span>
              </span>
              <span className="sr-only">engineering</span>
              <br />
              project,{" "}
              <span className="grad-text">
                built
                <br className="lg-br" /> like a pro.
              </span>
            </h1>
            <p className="lead">
              Working projects with source code, report, PPT and viva prep for every branch.
              {s.negotiable ? " Like a price? Order. Not quite? Make us an offer and let's talk." : ""}
            </p>
            <div className="row hero-ctas">
              <Link href="/projects" className="btn btn-primary btn-lg">
                Explore {total > 10 ? `${Math.floor(total / 5) * 5}+` : ""} projects <ArrowRight size={18} aria-hidden />
              </Link>
              <Link href="/custom" className={`btn btn-lg ${s.negotiable ? "btn-offer" : ""}`}>
                <HandCoins size={18} aria-hidden /> Price my own idea
              </Link>
            </div>
            <ul className="hero-points">
              <li>
                <Check size={16} aria-hidden /> Working demo before you pay in full
              </li>
              <li>
                <Check size={16} aria-hidden /> Code, report &amp; PPT
              </li>
              <li>
                <Check size={16} aria-hidden /> Viva prep
              </li>
            </ul>
          </div>

          <div className="hero-visual">
            {hero && <ProjectCard p={hero} negotiable={s.negotiable} className="float" />}
            {s.negotiable && (
              <div className="chat-mock float slow" aria-label="Example of an offer chat">
                <div className="cm-head">
                  <span className="eyebrow">How offers work</span>
                  <span className="neg">Example</span>
                </div>
                <div className="cm-msg me">Hi! Can you do {hero ? `“${hero.title.split(" with ")[0]}”` : "this project"} for {inr(offer)}? That's our team budget.</div>
                <div className="cm-msg us">We can meet you at {inr(deal)}, and that includes the viva prep call.</div>
                <div className="cm-deal">
                  <span>Deal at {inr(deal)}</span>
                  <Check size={18} aria-hidden />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="marquee" aria-hidden>
        <div className="marquee-track">
          {[...TECH, ...TECH].map((t, i) => (
            <span key={i}>
              <i /> {t}
            </span>
          ))}
        </div>
      </div>

      <section className="section">
        <div className="container stack-lg">
          <div className="stats-band reveal">
            <div>
              <b>{total}</b>
              <span>ready-to-build projects</span>
            </div>
            <div>
              <b>{BRANCHES.length}</b>
              <span>engineering branches</span>
            </div>
            <div>
              <b>{CATEGORIES.length}</b>
              <span>domains, from AI to fabrication</span>
            </div>
            <div>
              <b>{s.advancePercent}%</b>
              <span>to start, the rest after the demo</span>
            </div>
          </div>

          <div className="stack">
            <div className="section-head reveal" style={{ marginBottom: 0 }}>
              <div className="stack-xs">
                <span className="eyebrow">Pick your branch</span>
                <h2>Projects for every branch</h2>
              </div>
            </div>
            <div className="branches">
              {BRANCHES.map((b) => {
                const look = BRANCH_LOOK[b.id];
                const Icon = look.icon;
                return (
                  <Link key={b.id} href={`/projects?branch=${b.id}`} className={`branch-tile reveal cat-${look.cat}`}>
                    <span className="bi">
                      <Icon size={21} aria-hidden />
                    </span>
                    <b>{b.short}</b>
                    <small>{counts[b.id] ?? 0} projects</small>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head reveal">
              <div className="stack-xs">
                <span className="eyebrow">Most wanted</span>
                <h2>Featured projects</h2>
              </div>
              <Link href="/projects" className="btn btn-ghost">
                See all projects <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
            <div className="pgrid four">
              {featured.map((p) => (
                <ProjectCard key={p.id} p={p} negotiable={s.negotiable} className="reveal" />
              ))}
            </div>
          </div>
        </section>
      )}

      {s.negotiable && (
        <section className="section">
          <div className="container deal-grid">
            <div className="stack reveal">
              <span className="eyebrow">Prices you can talk about</span>
              <h2>
                Every price is <span className="warm-text">negotiable.</span>
              </h2>
              <p className="lead">
                Student budgets differ, and we get that. Tell us what you can pay and we'll work something out, right on your
                order page or on WhatsApp.
              </p>
              <ol className="deal-steps">
                <li>
                  <span>
                    <b>Pick a project or describe your idea</b>
                    <span>Every project shows its full price up front.</span>
                  </span>
                </li>
                <li>
                  <span>
                    <b>Make an offer</b>
                    <span>Choose “Make an offer” when you order, and add a note about your budget.</span>
                  </span>
                </li>
                <li>
                  <span>
                    <b>Agree and start</b>
                    <span>We accept, or reply with a counter-offer. Accept it in one tap and pay the advance.</span>
                  </span>
                </li>
              </ol>
            </div>
            <div className="card price-meter reveal" aria-label="Example negotiation">
              <div className="row between">
                <span className="eyebrow">Example</span>
                <HandCoins size={20} aria-hidden color="var(--accent)" />
              </div>
              <div className="pm-row">
                <div>
                  <span>Listed price</span>
                  <b>{inr(listed)}</b>
                </div>
                <div className="pm-bar">
                  <i style={{ width: "100%" }} />
                </div>
              </div>
              <div className="pm-row offer">
                <div>
                  <span>Your offer</span>
                  <b>{inr(offer)}</b>
                </div>
                <div className="pm-bar">
                  <i style={{ width: `${Math.round((offer / listed) * 100)}%` }} />
                </div>
              </div>
              <div className="pm-row deal">
                <div>
                  <span>We agree on</span>
                  <b>{inr(deal)}</b>
                </div>
                <div className="pm-bar">
                  <i style={{ width: `${Math.round((deal / listed) * 100)}%` }} />
                </div>
              </div>
              <Link href="/projects" className="btn btn-offer">
                <HandCoins size={17} aria-hidden /> Find a project and make an offer
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <div className="section-head reveal">
            <div className="stack-xs">
              <span className="eyebrow">Simple from start to viva</span>
              <h2>How it works</h2>
            </div>
          </div>
          <div className="steps">
            <div className="card step reveal">
              <span className="num">1</span>
              <h3>Choose or describe</h3>
              <p>Pick a ready project, or tell us your own idea with your deadline.</p>
            </div>
            <div className="card step reveal">
              <span className="num">2</span>
              <h3>Agree on the price</h3>
              <p>Order at the listed price{s.negotiable ? ", or make an offer and talk it through with us" : ""}.</p>
            </div>
            <div className="card step reveal">
              <span className="num">3</span>
              <h3>Pay {s.advancePercent}% to start</h3>
              <p>Pay the advance by UPI from any app. We build it and keep you posted.</p>
            </div>
            <div className="card step reveal">
              <span className="num">4</span>
              <h3>Get it, understand it</h3>
              <p>See the demo, pay the rest, and download code, report and PPT. We prepare you for the viva.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="container">
          <div className="section-head reveal">
            <div className="stack-xs">
              <span className="eyebrow">Pricing</span>
              <h2>Priced by difficulty</h2>
              <p>Starting prices for software projects. Hardware kits and fabricated models are included where needed.</p>
            </div>
            <Link href="/custom" className="btn btn-soft">
              Get an exact estimate <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
          <div className="tiers">
            {DIFFICULTIES.map((d) => (
              <div key={d.level} className="card tier reveal" data-level={d.level}>
                <div className="row between">
                  <Meter level={d.level} />
                  {s.negotiable && <span className="neg">Negotiable</span>}
                </div>
                <span className="from">starting at</span>
                <span className="price-lg">{inr(s.tierPrices[d.level - 1])}</span>
                <p>{d.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head reveal">
            <div className="stack-xs">
              <span className="eyebrow">In the box</span>
              <h2>What you get</h2>
            </div>
          </div>
          <div className="gets">
            {[
              [FileCode2, "Full source code"],
              [FileText, "Project report"],
              [Presentation, "PPT slides"],
              [Video, "Demo video"],
              [Laptop, "Setup on your laptop"],
              [MessageCircleQuestion, "Viva Q&A"],
              [Package, "Hardware kits, tested"],
              [BadgeCheck, "Free small changes"],
            ].map(([Icon, label]) => {
              const I = Icon as typeof FileCode2;
              return (
                <div key={label as string} className="card get reveal">
                  <span className="gi">
                    <I size={19} aria-hidden />
                  </span>
                  {label as string}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container narrow">
          <div className="section-head reveal">
            <div className="stack-xs">
              <span className="eyebrow">FAQ</span>
              <h2>Questions students ask</h2>
            </div>
          </div>
          <div className="faq reveal">
            {s.negotiable && (
              <details>
                <summary>Is the price fixed?</summary>
                <p>
                  No. Every listed price is open to discussion. When you order, choose “Make an offer” and enter what you can
                  pay. We reply on your order page, and you can go back and forth until it works for both of us. You only
                  pay once we've agreed.
                </p>
              </details>
            )}
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
                Most software projects take 4–15 days; hardware and fabrication projects 7–15 days. Every project page shows
                its delivery time. Tell us your deadline when you order.
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
              <summary>I have my own idea. Can you build it?</summary>
              <p>
                Yes. Use “Price my own idea”: describe it, pick how hard it is and your deadline, and you see an estimate at
                once. Add your budget, and we'll reply with a price.
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
          <div className="cta-band reveal">
            <div className="stack-sm">
              <h2>Got an idea? Let's talk price.</h2>
              <p>Describe it in a few lines, see the estimate in 30 seconds, and tell us your budget. No payment needed to ask.</p>
            </div>
            <div className="row">
              <Link href="/custom" className="btn btn-lg" style={{ background: "#fff", color: "#3524c9" }}>
                Price my idea <ArrowRight size={18} aria-hidden />
              </Link>
              {wa && (
                <a href={wa} className="btn btn-wa btn-lg" target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon /> WhatsApp us
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
