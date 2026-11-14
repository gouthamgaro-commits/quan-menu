import { Mail, Phone } from "lucide-react";
import Link from "next/link";
import InstallApp from "@/components/InstallApp";
import { LogoMark, WhatsAppIcon } from "@/components/Icons";
import { TabBar, TopNav } from "@/components/Nav";
import SetupNeeded from "@/components/SetupNeeded";
import { BRANCHES } from "@/lib/catalog";
import { getSettings } from "@/lib/data";
import { dbMode } from "@/lib/db";
import { phonePretty } from "@/lib/format";
import { waLink } from "@/lib/links";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  if (dbMode() === "missing") return <SetupNeeded />;
  const s = await getSettings();
  const wa = s.whatsapp ? waLink(s.whatsapp, `Hi ${s.brandName}! I have a question about a project.`) : "";

  return (
    <div className="has-tabbar">
      {s.announcement && <div className="topbar">{s.announcement}</div>}
      <header className="header">
        <div className="container header-in">
          <Link href="/" className="logo" aria-label={`${s.brandName} home`}>
            <span className="logo-mark">
              <LogoMark />
            </span>
            <span className="logo-name">{s.brandName}</span>
          </Link>
          <TopNav />
          <div className="header-cta">
            {wa && (
              <a className="btn btn-wa btn-sm" href={wa} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon size={16} /> Chat
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
              {s.brandName}
            </span>
            <p className="muted small">{s.tagline}{s.city ? ` · ${s.city}` : ""}</p>
            <p className="muted small">Ready-made and custom projects with source code, report, PPT and viva support.</p>
            <InstallApp />
          </div>
          <div>
            <h4>Projects by branch</h4>
            <ul>
              {BRANCHES.map((b) => (
                <li key={b.id}>
                  <Link href={`/projects?branch=${b.id}`}>{b.short} projects</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Help</h4>
            <ul>
              <li><Link href="/custom">Price my own idea</Link></li>
              <li><Link href="/track">Track my order</Link></li>
              <li><Link href="/policies">Payments, delivery & refunds</Link></li>
            </ul>
          </div>
          <div hidden={!s.whatsapp && !s.email}>
            <h4>Contact</h4>
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
            <span>© {new Date().getFullYear()} {s.brandName}</span>
            <Link href="/admin" className="muted tiny">Owner login</Link>
          </div>
        </div>
      </footer>
      <TabBar />
    </div>
  );
}
