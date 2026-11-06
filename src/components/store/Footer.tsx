import Link from "next/link";
import type { Department } from "@/lib/catalog";
import type { FooterStyle } from "@/lib/designs";
import { formatMoney } from "@/lib/money";
import { contactOf, socialOf, type Settings } from "@/lib/settings";
import { storeKind } from "@/lib/store-types";
import { cx } from "../ui/controls";
import InstallApp from "./InstallApp";
import NewsletterForm from "./NewsletterForm";

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X",
  pinterest: "Pinterest",
  youtube: "YouTube",
};

/** The footer, built differently for each design's footer style (lib/designs.ts), with the same links in each. */
export default function Footer({ settings, departments, variant = "columns" }: { settings: Settings; departments: Department[]; variant?: FooterStyle }) {
  const contact = contactOf(settings);
  const social = Object.entries(socialOf(settings)).filter(([, url]) => url && /^https?:\/\//.test(url));
  const year = new Date().getFullYear();
  const onBrand = variant === "columns" || variant === "bold" || variant === "heritage";

  const columns = (
    <>
      <FooterColumn title="Shop" onBrand={onBrand}>
        <FooterLink href="/shop?sort=newest" onBrand={onBrand}>New arrivals</FooterLink>
        {departments.map((d) => (
          <FooterLink key={d.id} href={`/category/${d.slug}`} onBrand={onBrand}>{d.name}</FooterLink>
        ))}
        <FooterLink href="/brands" onBrand={onBrand}>Brands</FooterLink>
        <FooterLink href="/collections" onBrand={onBrand}>Collections</FooterLink>
        <FooterLink href="/shop?sale=1" onBrand={onBrand}>Sale</FooterLink>
      </FooterColumn>
      <FooterColumn title="Customer care" onBrand={onBrand}>
        <FooterLink href="/contact" onBrand={onBrand}>Contact us</FooterLink>
        <FooterLink href="/faq" onBrand={onBrand}>FAQs</FooterLink>
        <FooterLink href="/orders/lookup" onBrand={onBrand}>Track your order</FooterLink>
        <FooterLink href="/pages/shipping" onBrand={onBrand}>Shipping &amp; delivery</FooterLink>
        <FooterLink href="/pages/returns" onBrand={onBrand}>Returns &amp; refunds</FooterLink>
        <FooterLink href="/account" onBrand={onBrand}>My account</FooterLink>
      </FooterColumn>
      <FooterColumn title={settings.store_name} onBrand={onBrand}>
        <FooterLink href="/pages/about" onBrand={onBrand}>Our story</FooterLink>
        <FooterLink href="/pages/privacy" onBrand={onBrand}>Privacy policy</FooterLink>
        <FooterLink href="/pages/terms" onBrand={onBrand}>Terms of service</FooterLink>
        {contact.email && <FooterLink href={`mailto:${contact.email}`} onBrand={onBrand}>{contact.email}</FooterLink>}
        {contact.phone && <li className={cx("text-sm", onBrand ? "text-on-brand-soft" : "text-taupe")}>{contact.phone}</li>}
        {contact.hours && <li className={cx("text-xs", onBrand ? "text-on-brand-soft" : "text-taupe")}>{contact.hours}</li>}
      </FooterColumn>
    </>
  );

  const legal = (
    <div className={cx("flex flex-col gap-4 py-6 text-xs md:flex-row md:items-center md:justify-between", onBrand ? "text-on-brand-soft" : "text-taupe")}>
      <p>
        © {year} {settings.store_name}. All prices in {settings.currency}
        {settings.tax_mode === "inclusive" ? `, inclusive of ${settings.tax_label}` : ""}.
        {settings.gstin ? ` GSTIN ${settings.gstin}.` : ""}
      </p>
      <p>Secure payments: UPI · Cards · Net banking · Wallets{settings.cod_enabled ? " · Cash on delivery" : ""}</p>
      <InstallApp storeName={settings.store_name} className={onBrand ? "hover:text-on-brand" : "hover:text-ink"} />
      {social.length > 0 && (
        <ul className="flex gap-4">
          {social.map(([key, url]) => (
            <li key={key}>
              <a href={url} target="_blank" rel="noopener noreferrer" className={onBrand ? "hover:text-on-brand" : "hover:text-ink"}>{SOCIAL_LABELS[key] ?? key}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  // The store's sign-up, in the words of what it sells (the home page has no other).
  const words = storeKind(settings.store_type).words;
  const join = words.newsletter;
  const pitch = `${words.newsletterText} No more than twice a month.`;

  switch (variant) {
    case "minimal":
      return (
        <footer className="mt-24 border-t border-line">
          <div className="container-page grid gap-10 py-12 md:grid-cols-[1fr_1fr] md:items-end">
            <div>
              <h2 className="text-[13px] font-medium tracking-[0.14em] uppercase">{join}</h2>
              <p className="mt-2 max-w-sm text-sm text-taupe">{pitch}</p>
            </div>
            <NewsletterForm />
          </div>
          <div className="container-page grid gap-10 border-t border-line py-12 sm:grid-cols-3">{columns}</div>
          <div className="container-page border-t border-line">{legal}</div>
        </footer>
      );

    case "bold":
      return (
        <footer className="on-brand mt-24 overflow-hidden bg-brand text-on-brand">
          <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
            <div className="max-w-md">
              <h2 className="font-serif text-4xl leading-none">{join}</h2>
              <p className="mt-4 text-sm leading-relaxed text-on-brand-soft">{pitch}</p>
              <NewsletterForm dark boxed />
            </div>
            {columns}
          </div>
          <p aria-hidden className="container-page font-serif text-[clamp(3rem,14vw,11rem)] leading-[0.85] tracking-tight whitespace-nowrap uppercase">{settings.store_name}</p>
          <div className="container-page border-t-2 border-on-brand/30">{legal}</div>
        </footer>
      );

    case "soft":
      return (
        <footer className="mt-24 rounded-t-[2.5rem] bg-sand">
          <div className="container-page py-16 text-center">
            <h2 className="font-serif text-4xl">{join}</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-taupe">{pitch}</p>
            <div className="mx-auto max-w-md text-left">
              <NewsletterForm boxed />
            </div>
          </div>
          <div className="container-page grid gap-10 border-t border-line py-12 text-center sm:grid-cols-3">{columns}</div>
          <div className="container-page border-t border-line text-center">{legal}</div>
        </footer>
      );

    case "heritage":
      return (
        <footer className="on-brand mt-24 bg-brand text-on-brand">
          <div aria-hidden className="ornament-band text-on-brand-soft" />
          <div className="container-page py-14 text-center">
            <p className="font-serif text-3xl tracking-[0.18em] uppercase">{settings.store_name}</p>
            {settings.tagline && <p className="mx-auto mt-3 max-w-md text-sm text-on-brand-soft">{settings.tagline}</p>}
            <span aria-hidden className="ornament mt-5 text-on-brand-soft" />
          </div>
          <div className="container-page grid gap-12 pb-14 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
            <div className="max-w-sm">
              <h2 className="font-serif text-2xl">{join}</h2>
              <p className="mt-3 text-sm leading-relaxed text-on-brand-soft">{pitch}</p>
              <NewsletterForm dark />
            </div>
            {columns}
          </div>
          <div className="container-page border-t border-on-brand/15">{legal}</div>
        </footer>
      );

    case "grand":
      return (
        <footer className="mt-24 border-t border-line">
          <div className="container-page py-20 text-center md:py-28" data-reveal>
            {settings.tagline && <p className="mx-auto max-w-4xl font-serif text-[clamp(2.5rem,6.5vw,5.5rem)] leading-[1.02]">{settings.tagline}</p>}
            <h2 className={cx("mx-auto font-serif leading-[1.05]", settings.tagline ? "mt-8 text-2xl" : "max-w-4xl text-[clamp(2.5rem,6.5vw,5.5rem)]")}>{join}</h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-taupe">{pitch}</p>
            <div className="mx-auto max-w-md text-left">
              <NewsletterForm boxed />
            </div>
          </div>
          <div className="container-page grid gap-10 border-t border-line py-12 text-center sm:grid-cols-3">{columns}</div>
          <div className="container-page border-t border-line text-center">{legal}</div>
        </footer>
      );

    case "neon":
      return (
        <footer className="mt-24 overflow-hidden border-t border-line">
          <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
            <div className="max-w-md">
              <h2 className="font-serif text-4xl leading-none">{join}</h2>
              <p className="mt-4 text-sm leading-relaxed text-taupe">{pitch}</p>
              <NewsletterForm boxed />
            </div>
            {columns}
          </div>
          <p aria-hidden className="wordmark-glow container-page font-serif text-[clamp(3rem,15vw,12rem)] leading-[0.9] whitespace-nowrap uppercase">{settings.store_name}</p>
          <div className="container-page border-t border-line">{legal}</div>
        </footer>
      );

    case "receipt":
      return (
        <footer className="mt-24 border-t border-ink">
          <div className="container-page grid gap-14 py-16 lg:grid-cols-[minmax(0,25rem)_1fr] lg:items-start">
            <div className="receipt mx-auto w-full max-w-sm font-mono text-[12px] uppercase">
              <p className="text-center font-serif text-3xl">{settings.store_name}</p>
              {settings.tagline && <p className="mt-1 text-center text-[11px] text-taupe normal-case">{settings.tagline}</p>}
              <p aria-hidden className="receipt-rule" />
              <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5">
                {!!settings.free_shipping_threshold && (
                  <><dt>Free delivery</dt><dd>Over {formatMoney(settings.free_shipping_threshold, settings.currency)}</dd></>
                )}
                {settings.return_window_days > 0 && (
                  <><dt>Returns</dt><dd>{settings.return_window_days} days</dd></>
                )}
                <dt>Cash on delivery</dt>
                <dd>{settings.cod_enabled ? "Yes" : "No"}</dd>
                <dt>Prices</dt>
                <dd>{settings.currency}{settings.tax_mode === "inclusive" ? `, incl. ${settings.tax_label}` : ""}</dd>
              </dl>
              <p aria-hidden className="receipt-rule" />
              <h2 className="text-center text-[13px] font-bold tracking-[0.08em]">{join}</h2>
              <p className="mt-2 text-center text-[11px] leading-relaxed text-taupe normal-case">{pitch}</p>
              <NewsletterForm />
              <p aria-hidden className="barcode mt-7" />
              <p className="mt-2 text-center text-[10px] tracking-[0.3em]">Thank you · Come again</p>
            </div>
            <div className="grid gap-10 sm:grid-cols-3">{columns}</div>
          </div>
          <div className="container-page border-t border-ink">{legal}</div>
        </footer>
      );

    case "taskbar":
      return (
        <footer className="mt-24">
          <div className="container-page">
            <div className="win-window">
              <p className="win-titlebar">
                <span aria-hidden className="flex gap-1"><i className="win-dot bg-brand" /><i className="win-dot bg-accent" /><i className="win-dot bg-sand" /></span>
                <span className="truncate">mailing-list.txt</span>
              </p>
              <div className="grid gap-12 p-6 md:p-10 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
                <div className="max-w-sm">
                  <h2 className="chrome-text font-serif text-3xl leading-tight">{join}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-taupe">{pitch}</p>
                  <NewsletterForm boxed />
                </div>
                {columns}
              </div>
            </div>
          </div>
          <div className="taskbar mt-10">
            <div className="container-page flex h-12 items-center gap-2 font-pixel text-[11px] uppercase">
              <Link href="/" className="taskbar-start"><span aria-hidden>✦</span> {settings.store_name}</Link>
              <Link href="/shop?sort=newest" className="taskbar-btn hidden sm:inline-flex">New in</Link>
              <Link href="/collections" className="taskbar-btn hidden sm:inline-flex">Collections</Link>
              <span className="ml-auto">© {year}</span>
            </div>
          </div>
          <div className="container-page">{legal}</div>
        </footer>
      );

    case "collage":
      return (
        <footer className="torn-top mt-24 bg-sand">
          <div className="container-page grid gap-12 pt-20 pb-14 lg:grid-cols-[1.25fr_repeat(3,1fr)]">
            <div className="paper-note -rotate-1 p-6 md:p-7">
              <h2 className="font-serif text-3xl leading-tight italic">{join}</h2>
              <p className="mt-2 text-sm leading-relaxed text-taupe">{pitch}</p>
              <NewsletterForm />
              <p className="mt-4 -rotate-2 font-hand text-2xl text-accent">see you soon x</p>
            </div>
            {columns}
          </div>
          <div className="container-page border-t border-dashed border-taupe/50">{legal}</div>
        </footer>
      );

    case "wordmark":
      return (
        <footer className="mt-24 overflow-hidden border-t border-line">
          <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
            <div className="max-w-sm">
              <h2 className="font-serif text-3xl">{join}</h2>
              <p className="mt-3 text-sm leading-relaxed text-taupe">{pitch}</p>
              <NewsletterForm />
            </div>
            {columns}
          </div>
          <p
            aria-hidden
            className="container-page font-serif text-[clamp(3.25rem,15vw,13rem)] leading-[0.85] whitespace-nowrap text-transparent uppercase [-webkit-text-stroke:1px_var(--color-taupe)]"
          >
            {settings.store_name}
          </p>
          <div className="container-page border-t border-line">{legal}</div>
        </footer>
      );

    default:
      return (
        <footer className="on-brand mt-24 bg-brand text-on-brand">
          <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
            <div className="max-w-sm">
              <h2 className="font-serif text-3xl">{join}</h2>
              <p className="mt-3 text-sm leading-relaxed text-on-brand-soft">{pitch}</p>
              <NewsletterForm dark />
            </div>
            {columns}
          </div>
          <div className="border-t border-on-brand/15">
            <div className="container-page">{legal}</div>
          </div>
        </footer>
      );
  }
}

function FooterColumn({ title, onBrand, children }: { title: string; onBrand: boolean; children: React.ReactNode }) {
  return (
    <div>
      <p className={cx("label-caps", onBrand ? "text-on-brand" : "text-ink")}>{title}</p>
      <ul className="mt-4 grid gap-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, onBrand, children }: { href: string; onBrand: boolean; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className={cx("text-sm", onBrand ? "text-on-brand-soft hover:text-on-brand" : "text-taupe hover:text-ink")}>{children}</Link>
    </li>
  );
}
