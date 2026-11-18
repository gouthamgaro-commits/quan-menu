import { Mail, Phone } from "lucide-react";
import Link from "next/link";
import InstallApp from "@/components/InstallApp";
import { LogoMark, WhatsAppIcon } from "@/components/Icons";
import { TabBar, TopNav } from "@/components/Nav";
import Reveal from "@/components/Reveal";
import SetupNeeded from "@/components/SetupNeeded";
import CurrencyPicker from "@/components/CurrencyPicker";
import { CATEGORIES } from "@/lib/catalog";
import { getSettings } from "@/lib/data";
import { CURRENCIES, visitorCurrency } from "@/lib/fx";
import { dbMode } from "@/lib/db";
import { inr, phonePretty } from "@/lib/format";
import { currentInvite } from "@/lib/invite";
import { waLink } from "@/lib/links";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  if (dbMode() === "missing") return <SetupNeeded />;
  const [s, cur, invite] = await Promise.all([getSettings(), visitorCurrency(), currentInvite()]);
  const wa = s.whatsapp ? waLink(s.whatsapp, `Hey ${s.brandName}! I have a question about a project 👋`) : "";

  return (
    <div className="store has-tabbar">
      <Reveal />
      {s.announcement && <div className="topbar">{s.announcement}</div>}
      {invite && (
        <div className="topbar invite-bar">
          🎁 {invite.friend}&apos;s friend code <b className="mono">{invite.code}</b> is on: {inr(invite.discount)} off your first order
        </div>
      )}
      <header className="header">
        <div className="container header-in">
          <Link href="/" className="logo" aria-label={`${s.brandName} home`}>
            <span className="logo-mark">
              <LogoMark />
            </span>
            <span className="logo-name">{s.brandName.toLowerCase()}</span>
          </Link>
          <TopNav />
          <div className="header-cta">
            {wa && (
              <a className="btn btn-wa btn-sm" href={wa} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon size={16} /> DM us
              </a>
            )}
          </div>
        </div>
      </header>

      <div id="main">{children}</div>

      <footer className="footer">
        <div className="container footer-in">
          <div className="stack-sm">
            <span className="logo">
              <span className="logo-mark">
                <LogoMark />
              </span>
              {s.brandName.toLowerCase()}
            </span>
            <p className="muted small">{s.tagline}{s.city ? ` · ${s.city}` : ""}</p>
            <p className="muted small">
              Working projects for coders and engineers everywhere: source code, docs, demo and a walkthrough so you actually
              get it.{s.negotiable ? " Every price is negotiable 🤝" : ""}
            </p>
            {s.localCurrency && <CurrencyPicker value={cur} options={CURRENCIES} />}
            <InstallApp />
          </div>
          <div>
            <h4>tracks</h4>
            <ul>
              {CATEGORIES.slice(0, 9).map((c) => (
                <li key={c.id}>
                  <Link href={`/projects?category=${c.id}`}>
                    {c.emoji} {c.short}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/projects?category=iot">🔌 Hardware & engineering</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>help</h4>
            <ul>
              <li><Link href="/custom">Pitch your own idea</Link></li>
              <li><Link href="/track">Track my order</Link></li>
              <li><Link href="/policies">Payments, delivery & refunds</Link></li>
            </ul>
          </div>
          <div hidden={!s.whatsapp && !s.email}>
            <h4>talk to us</h4>
            <ul>
              {wa && (
                <li>
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="row" style={{ gap: 6 }}>
                    <WhatsAppIcon size={15} /> {phonePretty(s.whatsapp)}
                  </a>
                </li>
              )}
              {s.whatsapp && (
                <li>
                  <a href={`tel:+${s.whatsapp}`} className="row" style={{ gap: 6 }}>
                    <Phone size={15} aria-hidden /> Call us
                  </a>
                </li>
              )}
              {s.email && (
                <li>
                  <a href={`mailto:${s.email}`} className="row" style={{ gap: 6 }}>
                    <Mail size={15} aria-hidden /> {s.email}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="footer-base">
          <div className="container row between">
            <span>
              © {new Date().getFullYear()} {s.brandName} · made with 💚 for coders everywhere
            </span>
            <Link href="/admin" className="muted tiny">
              Owner login
            </Link>
          </div>
        </div>
      </footer>
      <TabBar />
    </div>
  );
}
