import { ArrowRight, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { WhatsAppIcon } from "@/components/Icons";
import { Meter, ProjectCard } from "@/components/Ui";
import { CATEGORIES, DIFFICULTIES } from "@/lib/catalog";
import { categoryCounts, countProjects, getSettings, listProjects } from "@/lib/data";
import { approx, inr } from "@/lib/format";
import { getFx } from "@/lib/fx";
import { waLink } from "@/lib/links";
import { roundTo } from "@/lib/pricing";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: `${s.brandName} · ${s.tagline}`,
    description: `Working coding & engineering projects for students and self-taught devs worldwide: web, mobile, AI, data, cybersecurity, web3, games, cloud, core CS and hardware. Code, docs, demo and a walkthrough.${s.negotiable ? " Every price is negotiable." : ""}`,
    alternates: { canonical: "/" },
  };
}

// The last word repeats the first, so the loop has no jump.
const WORDS = ["web app?", "AI model?", "mobile app?", "game?", "discord bot?", "capstone?", "web app?"];
const MARQUEE = [
  "final-year projects",
  "capstones",
  "portfolio builds",
  "hackathon MVPs",
  "mini projects",
  "bootcamp projects",
  "college assignments",
  "resume projects",
];

export default async function Home() {
  const [s, featured, counts, total] = await Promise.all([getSettings(), listProjects({ limit: 8 }), categoryCounts(), countProjects()]);
  const fx = await getFx(s.localCurrency);
  const wa = s.whatsapp ? waLink(s.whatsapp, `Hey ${s.brandName}! I need help picking a project 👋`) : "";
  const hero = featured.find((p) => p.category === "web") ?? featured[0];
  // A worked example of an offer, using the hero project's real price.
  const listed = hero?.price ?? 20000;
  const offer = roundTo(listed * 0.8, 500);
  const deal = roundTo((listed + offer) / 2, 500);
  const shown = total > 10 ? `${Math.floor(total / 5) * 5}+` : String(total);

  return (
    <main>
      <section className="hero">
        <span className="deco a" aria-hidden>
          🚀
        </span>
        <span className="deco b" aria-hidden>
          💻
        </span>
        <span className="deco c" aria-hidden>
          ✨
        </span>
        <div className="container hero-grid">
          <div className="stack">
            <div className="row">
              <span className="sticker lime">🔥 {shown} projects ready to ship</span>
              <span className="sticker pink r">🌍 for students everywhere</span>
            </div>
            <h1>
              need a{" "}
              <br />
              <span className="rotator" aria-hidden>
                <span>
                  {WORDS.map((w, i) => (
                    <span key={i}>
                      <span className="w">{w}</span>
                    </span>
                  ))}
                </span>
              </span>
              <span className="sr-only">coding project?</span>
              <br />
              we got you <span className="emoji">🫡</span>
            </h1>
            <p className="lead">
              Real, working projects for <b>CS students, coding bootcamps and self-taught devs</b>, anywhere in the world. You get
              the code, docs, a demo and a walkthrough, so you actually get it.
              {s.negotiable ? " Price feels high? Shoot your shot 🎯" : ""}
            </p>
            <div className="row hero-ctas">
              <Link href="/projects" className="btn btn-primary btn-lg">
                browse projects <ArrowRight size={19} aria-hidden strokeWidth={2.6} />
              </Link>
              <Link href="/custom" className="btn btn-offer btn-lg">
                pitch your idea 💡
              </Link>
            </div>
            <ul className="hero-points">
              <li>✅ demo before you pay in full</li>
              {s.negotiable && <li>🤝 every price negotiable</li>}
              <li>📦 code + docs + slides</li>
            </ul>
          </div>

          <div className="hero-visual">
            {hero && <ProjectCard p={hero} negotiable={s.negotiable} fx={fx} className="float" />}
            {s.negotiable && (
              <div className="chat-mock" aria-label="Example of how offers work">
                <div className="cm-head">
                  <b>shoot your shot 🎯</b>
                  <span className="sticker white" style={{ fontSize: 12, padding: "3px 9px" }}>
                    example
                  </span>
                </div>
                <div className="cm-msg me">can u do it for {inr(offer)}? that&apos;s our team budget 🙏</div>
                <div className="cm-msg us">meet u at {inr(deal)}? and we&apos;ll throw in the viva prep call 😎</div>
                <div className="cm-deal">
                  <span>deal at {inr(deal)} 🤝</span>
                  <Check size={20} aria-hidden strokeWidth={3} />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="marquee" aria-hidden>
        <div className="marquee-track">
          {[...MARQUEE, ...MARQUEE].map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      </div>

      <section className="section">
        <div className="container stack-lg">
          <div className="stats-band reveal">
            <div>
              <b>{total}</b>
              <span>projects ready to build</span>
            </div>
            <div>
              <b>{CATEGORIES.length}</b>
              <span>tracks, from web dev to robots</span>
            </div>
            <div>
              <b>🌍</b>
              <span>any country, any college, any bootcamp</span>
            </div>
            <div>
              <b>{s.advancePercent}%</b>
              <span>to start. rest after the demo</span>
            </div>
          </div>

          <div className="stack">
            <div className="section-head reveal" style={{ marginBottom: 0 }}>
              <div className="stack-xs">
                <span className="sticker yellow">pick your vibe ✌️</span>
                <h2 style={{ marginTop: 10 }}>what are you building?</h2>
              </div>
            </div>
            <div className="vibes reveal">
              {CATEGORIES.map((c) => (
                <Link key={c.id} href={`/projects?category=${c.id}`} className={`vibe cat-${c.id}`}>
                  <span className="ve" aria-hidden>
                    {c.emoji}
                  </span>
                  <span>
                    {c.short}
                    <small>{counts[c.id] ?? 0} projects</small>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head reveal">
              <div className="stack-xs">
                <span className="sticker pink">trending rn 🔥</span>
                <h2 style={{ marginTop: 10 }}>students are grabbing these</h2>
              </div>
              <Link href="/projects" className="btn">
                see all {shown} <ArrowRight size={17} aria-hidden strokeWidth={2.6} />
              </Link>
            </div>
            <div className="pgrid four">
              {featured.map((p) => (
                <ProjectCard key={p.id} p={p} negotiable={s.negotiable} fx={fx} className="reveal" />
              ))}
            </div>
          </div>
        </section>
      )}

      {s.negotiable && (
        <section className="section">
          <div className="container deal-grid">
            <div className="stack reveal">
              <span className="sticker lime">no fixed prices 🙅</span>
              <h2>
                price feels <span className="hl pink">sus</span>? shoot your shot 🎯
              </h2>
              <p className="lead">Student budgets are real. Tell us what you can pay, and we&apos;ll figure it out together, right in your order chat.</p>
              <ol className="deal-steps">
                <li>
                  <span>
                    <b>pick a project (or pitch yours)</b>
                    <span>Every project shows its full price up front. No hidden stuff.</span>
                  </span>
                </li>
                <li>
                  <span>
                    <b>hit “make an offer”</b>
                    <span>Name your price and drop a note, like “we&apos;re 3 broke students 😭”.</span>
                  </span>
                </li>
                <li>
                  <span>
                    <b>haggle a lil, then lock it in</b>
                    <span>We accept or counter. You accept in one tap, pay the advance, and we start cooking.</span>
                  </span>
                </li>
              </ol>
            </div>
            <div className="card price-meter reveal" aria-label="Example negotiation">
              <div className="row between">
                <b>how it usually goes</b>
                <span className="sticker white" style={{ fontSize: 12, padding: "3px 9px" }}>
                  example
                </span>
              </div>
              <div className="pm-row">
                <div>
                  <span>listed price</span>
                  <b>{inr(listed)}</b>
                </div>
                <div className="pm-bar">
                  <i style={{ width: "100%" }} />
                </div>
              </div>
              <div className="pm-row offer">
                <div>
                  <span>your offer</span>
                  <b>{inr(offer)}</b>
                </div>
                <div className="pm-bar">
                  <i style={{ width: `${Math.round((offer / listed) * 100)}%` }} />
                </div>
              </div>
              <div className="pm-row deal">
                <div>
                  <span>the deal 🤝</span>
                  <b>{inr(deal)}</b>
                </div>
                <div className="pm-bar">
                  <i style={{ width: `${Math.round((deal / listed) * 100)}%` }} />
                </div>
              </div>
              <Link href="/projects" className="btn btn-offer">
                find a project & make an offer
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <div className="section-head reveal">
            <div className="stack-xs">
              <span className="sticker purple">why us tho 👀</span>
              <h2 style={{ marginTop: 10 }}>it&apos;s not just code</h2>
            </div>
          </div>
          <div className="bento">
            <div className="lime wide reveal">
              <span className="em">📦</span>
              <h3>the whole kit</h3>
              <p>Full source code, docs/report, slides, a demo video and setup help on your laptop. Everything your college or your portfolio needs.</p>
            </div>
            <div className="pink reveal">
              <span className="em">🧑‍🏫</span>
              <h3>we explain it</h3>
              <p>Walkthrough + viva and interview Q&amp;A, so you can defend it like you built it.</p>
            </div>
            <div className="yellow reveal">
              <span className="em">🌍</span>
              <h3>worldwide</h3>
              <p>Pay by UPI, PayPal or card. Prices shown in your currency too.</p>
            </div>
            <div className="blue reveal">
              <span className="em">⚡</span>
              <h3>fast af</h3>
              <p>Most projects are ready in 4–15 days. Deadline tomorrow? DM us, we&apos;ll see what we can do.</p>
            </div>
            <div className="purple reveal">
              <span className="em">🔁</span>
              <h3>free small fixes</h3>
              <p>Need a name, screenshot or colour changed after delivery? Free for 15 days.</p>
            </div>
            <div className="mint wide reveal">
              <span className="em">🎓</span>
              <h3>batch deals for whole classes</h3>
              <p>Ordering for your whole class or coding bootcamp batch? We do group pricing, and every student gets their own unique project. Hit us up on WhatsApp.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head reveal">
            <div className="stack-xs">
              <span className="sticker yellow">easy peasy 🍋</span>
              <h2 style={{ marginTop: 10 }}>how it works</h2>
            </div>
          </div>
          <div className="steps">
            <div className="card step reveal">
              <span className="num">1</span>
              <h3>pick or pitch</h3>
              <p>Grab a ready project, or pitch your own idea with your deadline.</p>
            </div>
            <div className="card step reveal">
              <span className="num">2</span>
              <h3>agree the price</h3>
              <p>Order at the listed price{s.negotiable ? ", or make an offer and haggle a lil" : ""}.</p>
            </div>
            <div className="card step reveal">
              <span className="num">3</span>
              <h3>pay {s.advancePercent}% &amp; chill</h3>
              <p>Pay the advance by UPI, PayPal or card. We cook and keep you posted.</p>
            </div>
            <div className="card step reveal">
              <span className="num">4</span>
              <h3>get it + learn it</h3>
              <p>See the demo, pay the rest, download everything, and we prep you for the viva.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="container">
          <div className="section-head reveal">
            <div className="stack-xs">
              <span className="sticker lime">pricing 💸</span>
              <h2 style={{ marginTop: 10 }}>priced by how hard it is</h2>
              <p>Starting prices for software projects. Hardware kits are included where needed.</p>
            </div>
            <Link href="/custom" className="btn btn-soft">
              get an exact estimate <ArrowRight size={17} aria-hidden strokeWidth={2.6} />
            </Link>
          </div>
          <div className="tiers">
            {DIFFICULTIES.map((d) => (
              <div key={d.level} className="card tier reveal" data-level={d.level}>
                <div className="row between">
                  <Meter level={d.level} />
                  {s.negotiable && <span className="neg">negotiable 🤝</span>}
                </div>
                <span className="from">starting at</span>
                <span className="price-lg">{inr(s.tierPrices[d.level - 1])}</span>
                {fx && <span className="approx">{approx(s.tierPrices[d.level - 1], fx)}</span>}
                <p>{d.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container narrow">
          <div className="section-head reveal">
            <div className="stack-xs">
              <span className="sticker pink">faq 🤔</span>
              <h2 style={{ marginTop: 10 }}>stuff people ask</h2>
            </div>
          </div>
          <div className="faq reveal">
            {s.negotiable && (
              <details>
                <summary>is the price fixed?</summary>
                <p>
                  Nope. Every listed price is open to discussion. When you order, pick “make an offer” and type what you can pay.
                  We reply in your order chat, and you can go back and forth until it works for both of us. You only pay once
                  we&apos;ve agreed.
                </p>
              </details>
            )}
            <details>
              <summary>i&apos;m not in India. can i still order?</summary>
              <p>
                Yes! It&apos;s code, so if you have internet, we deliver. Pay by PayPal or card link (or UPI in India). We show
                prices in your currency too, so no maths needed.
              </p>
            </details>
            <details>
              <summary>will i actually understand the project?</summary>
              <p>
                That&apos;s the whole point. You get docs, slides and a list of viva / interview questions with answers, and we
                walk you through the code. You can also book a 1-on-1 explanation call.
              </p>
            </details>
            <details>
              <summary>how fast can you build it?</summary>
              <p>Most software projects take 4–15 days; hardware builds 7–15 days. Every project shows its time. Tell us your deadline when you order.</p>
            </details>
            <details>
              <summary>can you build my own idea?</summary>
              <p>
                100%. Hit “pitch your idea”, describe it, pick how hard it is and your deadline, and you&apos;ll see an estimate
                instantly. Add your budget and we&apos;ll reply with a price.
              </p>
            </details>
            <details>
              <summary>what about hardware / electronics projects?</summary>
              <p>We do those too: IoT, robots, electrical and mechanical builds. The kit arrives assembled and tested, with code and circuit diagrams.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="cta-band reveal">
            <div className="stack-sm">
              <span className="sticker lime">no cap 🧢</span>
              <h2>deadline coming in hot? 🔥</h2>
              <p>Pitch your idea, see the estimate in 30 seconds, tell us your budget. Asking is free.</p>
            </div>
            <div className="row">
              <Link href="/custom" className="btn btn-primary btn-lg">
                pitch my idea <ArrowRight size={19} aria-hidden strokeWidth={2.6} />
              </Link>
              {wa && (
                <a href={wa} className="btn btn-wa btn-lg" target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon /> DM us
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
