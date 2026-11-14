import Link from "next/link";
import type { Department } from "@/lib/catalog";
import { monogram, type Design, type HeaderStyle } from "@/lib/designs";
import { contactOf, type Settings } from "@/lib/settings";
import CatalogImage from "../ui/CatalogImage";
import { cx } from "../ui/controls";
import { ChevronDown, SearchIcon } from "../ui/icons";
import Announcement from "./Announcement";
import HeaderActions from "./HeaderActions";
import { AutoHideHeader, OverlayHeader } from "./HeaderShells";
import MobileMenu from "./MobileMenu";

// The storefront's header, built differently for each design's header style (lib/designs.ts).
// Every style keeps the same parts with the same names (the menu, search, account, wishlist,
// bag and the "Main" navigation), so shoppers, screen readers and tests find them anywhere.

interface NavItem {
  key: string;
  label: string;
  href: string;
  sale?: boolean;
  department?: Department;
}

function navItems(departments: Department[]): NavItem[] {
  return [
    { key: "new", label: "New In", href: "/shop?sort=newest" },
    ...departments.map((d) => ({ key: d.id, label: d.name, href: `/category/${d.slug}`, department: d })),
    { key: "brands", label: "Brands", href: "/brands" },
    { key: "collections", label: "Collections", href: "/collections" },
    { key: "sale", label: "Sale", href: "/shop?sale=1", sale: true },
  ];
}

const hasChildren = (i: NavItem) => !!i.department?.children.length;

const WORDMARK: Record<HeaderStyle, string> = {
  classic: "text-[1.65rem] tracking-[0.32em] uppercase",
  inline: "text-xl tracking-tight",
  bold: "text-2xl tracking-tight uppercase sm:text-[1.75rem]",
  centered: "text-[1.9rem]",
  heritage: "text-2xl tracking-[0.22em] uppercase",
  overlay: "text-xl tracking-[0.42em] uppercase",
  floating: "text-xl tracking-tight sm:text-2xl",
  glass: "text-xl tracking-tight uppercase",
  utility: "text-2xl tracking-[0.02em] uppercase",
  window: "text-xl sm:text-2xl",
  tape: "text-2xl italic",
  slab: "extrude-text text-xl tracking-tight sm:text-2xl",
  pillow: "puffy-text text-2xl",
  frost: "text-xl tracking-[0.08em] uppercase",
  cabinet: "neon-text text-xl uppercase tracking-[0.04em] sm:text-2xl",
  letterhead: "text-2xl tracking-[0.06em]",
  fold: "cutout-text text-2xl",
  keycaps: "text-lg font-bold tracking-tight",
  segmented: "text-xl font-bold tracking-tight",
  metal: "liquid-text text-xl font-bold tracking-tight sm:text-2xl",
  club: "text-xl tracking-[0.3em] uppercase sm:text-[1.6rem]",
};
const LOGO_HEIGHT: Record<HeaderStyle, string> = {
  classic: "h-8", inline: "h-7", bold: "h-9", centered: "h-10", heritage: "h-10", overlay: "h-8", floating: "h-7", glass: "h-8", utility: "h-7", window: "h-8", tape: "h-8", slab: "h-8", pillow: "h-9", frost: "h-8",
  cabinet: "h-8", letterhead: "h-9", fold: "h-8", keycaps: "h-7", segmented: "h-8", metal: "h-8", club: "h-10",
};

export function Logo({ settings, variant = "classic", className }: { settings: Settings; variant?: HeaderStyle; className?: string }) {
  return (
    <Link href="/" className={className} aria-label={`${settings.store_name} home`}>
      {settings.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={settings.logo_url} alt={settings.store_name} className={cx("w-auto", LOGO_HEIGHT[variant])} />
      ) : (
        <span className={cx("font-serif leading-none", WORDMARK[variant])}>{settings.store_name}</span>
      )}
    </Link>
  );
}

/** The big drop-down under a department: its categories, shortcuts and picture. */
function MegaPanel({ d }: { d: Department }) {
  return (
    <div className="invisible absolute inset-x-0 top-full border-y border-line bg-ivory normal-case tracking-normal opacity-0 shadow-sm transition duration-200 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
      <div className="container-page grid grid-cols-[1fr_1fr_18rem] gap-10 py-10">
        <div>
          <p className="label-caps text-stone">Shop {d.name}</p>
          <ul className="mt-4 grid gap-2.5 font-serif text-xl">
            <li><Link href={`/category/${d.slug}`} className="hover:text-accent">All {d.name}</Link></li>
            {d.children.map((c) => (
              <li key={c.id}><Link href={`/category/${c.slug}`} className="hover:text-accent">{c.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="label-caps text-stone">Discover</p>
          <ul className="mt-4 grid gap-2.5 text-sm">
            <li><Link href={`/shop?category=${d.slug}&sort=newest`} className="hover:text-accent">New arrivals</Link></li>
            <li><Link href={`/shop?category=${d.slug}&sort=popular`} className="hover:text-accent">Best sellers</Link></li>
            <li><Link href={`/shop?category=${d.slug}&sale=1`} className="hover:text-accent">On sale</Link></li>
            <li><Link href="/brands" className="hover:text-accent">All brands</Link></li>
          </ul>
        </div>
        {d.image_url && (
          <Link href={`/category/${d.slug}`} className="group/tile relative block aspect-[4/5] overflow-hidden rounded-img bg-bone">
            <CatalogImage src={d.image_url} alt="" fill sizes="18rem" className="object-cover transition duration-700 group-hover/tile:scale-105" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-4 font-serif text-2xl text-white">{d.name}</span>
          </Link>
        )}
      </div>
    </div>
  );
}

/** A small drop-down list of a department's categories. */
function DropList({ item, className, panelClassName }: { item: NavItem; className?: string; panelClassName?: string }) {
  const d = item.department!;
  return (
    <div className={cx("invisible absolute top-full z-10 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100", className)}>
      <ul className={cx("grid min-w-56 gap-2.5 text-sm", panelClassName)}>
        <li><Link href={item.href} className="underline-offset-4 hover:underline">All {d.name}</Link></li>
        {d.children.map((c) => (
          <li key={c.id}><Link href={`/category/${c.slug}`} className="text-taupe hover:text-ink">{c.name}</Link></li>
        ))}
      </ul>
    </div>
  );
}

const Chevron = ({ item, size = 12 }: { item: NavItem; size?: number }) => (hasChildren(item) ? <ChevronDown size={size} className="opacity-50" /> : null);

interface Props {
  settings: Settings;
  departments: Department[];
  announcement?: string;
  design: Design;
  /** The home page opens with a full-screen banner the header can sit over (Noir, Cinema, Neon). */
  overlayHero?: boolean;
}

export default function Header({ settings, departments, announcement, design, overlayHero = false }: Props) {
  const items = navItems(departments);
  const menu = <MobileMenu departments={departments} storeName={settings.store_name} />;
  const bar = <Announcement text={announcement} variant={design.announcement} />;

  switch (design.header) {
    case "inline":
      return (
        <>
          {bar}
          <AutoHideHeader className="sticky top-0 z-40 border-b border-line bg-ivory/95 backdrop-blur supports-[backdrop-filter]:bg-ivory/90">
            <div className="container-page flex h-14 items-center gap-4 lg:h-16 lg:gap-9">
              <div className="lg:hidden">{menu}</div>
              <Logo settings={settings} variant="inline" />
              <nav aria-label="Main" className="hidden lg:block">
                <ul className="flex items-center gap-6 text-[13px]">
                  {items.map((i) => (
                    <li key={i.key} className="group relative">
                      <Link href={i.href} aria-haspopup={hasChildren(i) ? "true" : undefined} className={cx("flex h-16 items-center border-b-2 border-transparent transition-colors", i.sale ? "text-sale" : "hover:border-ink")}>
                        {i.label}
                      </Link>
                      {hasChildren(i) && <DropList item={i} className="left-0" panelClassName="border border-line bg-ivory p-5 shadow-sm" />}
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="ml-auto"><HeaderActions /></div>
            </div>
          </AutoHideHeader>
        </>
      );

    case "bold":
      return (
        <>
          {bar}
          <header className="sticky top-0 z-40 border-b-2 border-ink bg-ivory">
            <div className="container-page flex h-16 items-center gap-3 lg:h-20 lg:gap-8">
              <div className="lg:hidden">{menu}</div>
              <Logo settings={settings} variant="bold" />
              <form action="/shop" role="search" className="hidden flex-1 lg:block">
                <label htmlFor="header-search" className="sr-only">Search products</label>
                <div className="relative">
                  <SearchIcon size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2" />
                  <input
                    id="header-search"
                    name="q"
                    type="search"
                    placeholder={`Search ${settings.store_name}`}
                    className="h-11 w-full rounded-btn border-2 border-ink bg-field pr-4 pl-11 text-sm transition-shadow outline-none placeholder:text-stone focus:shadow-[4px_4px_0_var(--color-ink)]"
                  />
                </div>
              </form>
              <div className="ml-auto lg:ml-0"><HeaderActions searchOnWide={false} /></div>
            </div>
            <nav aria-label="Main" className="border-t-2 border-ink bg-paper">
              <ul className="container-page scrollbar-none flex gap-2 overflow-x-auto py-2.5">
                {items.map((i) => (
                  <li key={i.key} className="shrink-0">
                    <Link
                      href={i.href}
                      className={cx(
                        "inline-flex h-9 items-center rounded-btn border-2 px-4 text-xs font-bold tracking-wide whitespace-nowrap uppercase transition-colors",
                        i.sale ? "border-sale-fill bg-sale-fill text-white hover:opacity-90" : "border-ink hover:bg-ink hover:text-ivory",
                      )}
                    >
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </header>
        </>
      );

    case "centered":
      return (
        <>
          {bar}
          <header className="sticky top-0 z-40 bg-ivory/95 shadow-[0_1px_0_var(--color-line)] backdrop-blur supports-[backdrop-filter]:bg-ivory/90">
            <div className="container-page grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 lg:h-[5.25rem]">
              <div className="flex items-center gap-2">
                <div className="lg:hidden">{menu}</div>
                <div className="hidden items-center gap-1 text-xs lg:flex">
                  <Link href="/orders/lookup" className="rounded-btn px-3 py-1.5 text-taupe hover:bg-bone hover:text-ink">Track order</Link>
                  <Link href="/contact" className="rounded-btn px-3 py-1.5 text-taupe hover:bg-bone hover:text-ink">Help</Link>
                </div>
              </div>
              <Logo settings={settings} variant="centered" className="justify-self-center" />
              <HeaderActions />
            </div>
            <nav aria-label="Main" className="hidden pb-3 lg:block">
              <ul className="flex flex-wrap items-center justify-center gap-1.5">
                {items.map((i) => (
                  <li key={i.key} className="group relative">
                    <Link href={i.href} aria-haspopup={hasChildren(i) ? "true" : undefined} className={cx("inline-flex h-9 items-center gap-1 rounded-btn px-4 text-sm transition-colors hover:bg-bone", i.sale && "text-sale")}>
                      {i.label}
                      <Chevron item={i} />
                    </Link>
                    {hasChildren(i) && <DropList item={i} className="left-1/2 -translate-x-1/2 pt-2" panelClassName="rounded-card border border-line bg-paper p-5 shadow-lg" />}
                  </li>
                ))}
              </ul>
            </nav>
          </header>
        </>
      );

    case "heritage": {
      const contact = contactOf(settings);
      const reach = contact.whatsapp || contact.phone;
      return (
        <>
          {bar}
          <div className="border-b border-line bg-bone text-xs text-taupe">
            <div className="container-page flex h-9 items-center justify-between gap-4">
              <p className="truncate">{reach ? `Call or WhatsApp ${reach}` : contact.hours || settings.tagline}</p>
              <div className="hidden shrink-0 items-center gap-3 sm:flex">
                <Link href="/orders/lookup" className="hover:text-ink">Track order</Link>
                <span aria-hidden className="text-[8px] text-accent">◆</span>
                <Link href="/contact" className="hover:text-ink">Help</Link>
              </div>
            </div>
          </div>
          <header className="sticky top-0 z-40 border-b border-line bg-ivory/95 backdrop-blur supports-[backdrop-filter]:bg-ivory/90">
            <div className="container-page grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 lg:h-20">
              <div><div className="lg:hidden">{menu}</div></div>
              <div className="flex items-center gap-4 justify-self-center">
                <span aria-hidden className="ornament hidden w-12 text-accent md:inline-block" />
                <Logo settings={settings} variant="heritage" />
                <span aria-hidden className="ornament hidden w-12 text-accent md:inline-block" />
              </div>
              <HeaderActions />
            </div>
            <nav aria-label="Main" className="hidden border-t border-line lg:block">
              <ul className="flex items-center justify-center gap-6 text-[12px] tracking-[0.16em] uppercase">
                {items.map((i, n) => (
                  <li key={i.key} className="group static flex items-center gap-6">
                    {n > 0 && <span aria-hidden className="text-[7px] text-accent">◆</span>}
                    <Link href={i.href} aria-haspopup={hasChildren(i) ? "true" : undefined} className={cx("flex h-12 items-center gap-1", i.sale ? "text-sale hover:opacity-80" : "hover:text-accent")}>
                      {i.label}
                      <Chevron item={i} />
                    </Link>
                    {hasChildren(i) && <MegaPanel d={i.department!} />}
                  </li>
                ))}
              </ul>
            </nav>
          </header>
        </>
      );
    }

    case "floating":
      return (
        <OverlayHeader overlayOnHome={overlayHero} mode="floating" onPhoto={design.hero !== "glow"} top={bar}>
          <div className="px-3 pt-3 pb-1 sm:px-4">
            <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 rounded-full border border-line bg-paper/80 px-3 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.25)] backdrop-blur-xl supports-[backdrop-filter]:bg-paper/65 sm:px-5 lg:gap-5 xl:gap-8">
              <div className="lg:hidden">{menu}</div>
              <Logo settings={settings} variant="floating" />
              <nav aria-label="Main" className="hidden flex-1 lg:block">
                <ul className="flex items-center justify-center gap-1">
                  {items.map((i) => (
                    <li key={i.key} className="group relative">
                      <Link href={i.href} aria-haspopup={hasChildren(i) ? "true" : undefined} className={cx("inline-flex h-9 items-center rounded-full px-2 text-[13px] whitespace-nowrap transition-colors hover:bg-bone xl:px-3.5", i.sale && "text-sale")}>
                        {i.label}
                      </Link>
                      {hasChildren(i) && <DropList item={i} className="left-1/2 -translate-x-1/2 pt-3" panelClassName="rounded-card border border-line bg-paper/95 p-5 shadow-xl backdrop-blur-xl" />}
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="ml-auto lg:ml-0"><HeaderActions /></div>
            </div>
          </div>
        </OverlayHeader>
      );

    case "glass":
      return (
        <OverlayHeader overlayOnHome={overlayHero} mode="glass" onPhoto={design.hero !== "glow"} top={bar}>
          <div className="container-page flex h-16 items-center gap-4 lg:h-[4.5rem] lg:gap-6 xl:gap-8">
            <div className="lg:hidden">{menu}</div>
            <Logo settings={settings} variant="glass" />
            <nav aria-label="Main" className="hidden flex-1 lg:block">
              <ul className="flex items-center justify-center gap-5 text-[12px] font-semibold tracking-[0.1em] whitespace-nowrap uppercase xl:gap-7 xl:tracking-[0.14em]">
                {items.map((i) => (
                  <li key={i.key} className="group relative">
                    <Link href={i.href} aria-haspopup={hasChildren(i) ? "true" : undefined} className={cx("flex h-16 items-center transition-colors lg:h-[4.5rem]", i.sale ? "text-sale" : "hover:text-accent")}>
                      {i.label}
                    </Link>
                    {hasChildren(i) && <DropList item={i} className="left-1/2 -translate-x-1/2" panelClassName="rounded-card border border-line bg-ivory/90 p-5 normal-case tracking-normal shadow-2xl backdrop-blur-xl" />}
                  </li>
                ))}
              </ul>
            </nav>
            <div className="ml-auto flex items-center gap-3 lg:ml-0">
              <HeaderActions />
              <Link href="/shop?sort=newest" className="hidden h-9 items-center rounded-btn bg-brand px-5 text-[11px] font-bold tracking-[0.14em] whitespace-nowrap text-on-brand uppercase shadow-[0_0_28px_-4px_var(--color-brand)] sm:inline-flex lg:hidden xl:inline-flex">
                Shop now
              </Link>
            </div>
          </div>
        </OverlayHeader>
      );

    case "utility":
      return (
        <>
          {bar}
          <header className="sticky top-0 z-40 border-b border-ink bg-ivory text-[11px] uppercase">
            <div className="container-page flex h-14 items-stretch lg:h-16">
              <div className="flex items-center pr-3 lg:hidden">{menu}</div>
              <Logo settings={settings} variant="utility" className="flex items-center border-x border-ink px-4" />
              <nav aria-label="Main" className="hidden flex-1 lg:block">
                <ul className="flex h-full items-stretch font-mono tracking-[0.06em]">
                  {items.map((i) => (
                    <li key={i.key} className="group relative flex">
                      <Link
                        href={i.href}
                        aria-haspopup={hasChildren(i) ? "true" : undefined}
                        className={cx("utility-link flex items-center border-r border-ink px-3 whitespace-nowrap transition-colors hover:bg-ink hover:text-ivory xl:px-4", i.sale && "text-sale")}
                      >
                        {i.label}
                      </Link>
                      {hasChildren(i) && <DropList item={i} className="left-0" panelClassName="border border-ink bg-ivory p-5 normal-case" />}
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="ml-auto flex items-center border-l border-ink pl-2 sm:pl-3"><HeaderActions /></div>
            </div>
          </header>
        </>
      );

    case "window":
      return (
        <>
          {bar}
          <header className="sticky top-0 z-40 px-2 pt-2 sm:px-4">
            <div className="win-chrome mx-auto flex h-14 max-w-7xl items-center gap-3 rounded-[14px] border border-line px-3 shadow-[0_12px_30px_-18px_rgb(0_0_0/0.4)] backdrop-blur-xl sm:px-4">
              <span aria-hidden className="hidden items-center gap-1.5 sm:flex">
                <i className="win-dot bg-brand" />
                <i className="win-dot bg-accent" />
                <i className="win-dot bg-sand" />
              </span>
              <div className="lg:hidden">{menu}</div>
              <Logo settings={settings} variant="window" />
              <nav aria-label="Main" className="hidden flex-1 lg:block">
                <ul className="flex items-center justify-center gap-0.5 font-pixel text-[11px] uppercase">
                  {items.map((i) => (
                    <li key={i.key} className="group relative">
                      <Link
                        href={i.href}
                        aria-haspopup={hasChildren(i) ? "true" : undefined}
                        className={cx("inline-flex h-8 items-center rounded-full px-2.5 whitespace-nowrap transition-colors hover:bg-brand hover:text-on-brand xl:px-3.5", i.sale && "text-sale")}
                      >
                        {i.label}
                      </Link>
                      {hasChildren(i) && <DropList item={i} className="left-1/2 -translate-x-1/2 pt-3" panelClassName="win-panel rounded-card p-5 font-sans normal-case" />}
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="ml-auto lg:ml-0"><HeaderActions /></div>
            </div>
          </header>
        </>
      );

    case "tape":
      return (
        <>
          {bar}
          <header className="sticky top-0 z-40 border-b border-dashed border-taupe/50 bg-ivory/95 backdrop-blur supports-[backdrop-filter]:bg-ivory/90">
            <div className="container-page flex h-16 items-center gap-4 lg:h-[4.5rem]">
              <div className="lg:hidden">{menu}</div>
              <Logo settings={settings} variant="tape" className="tape-label" />
              <nav aria-label="Main" className="hidden flex-1 lg:block">
                <ul className="flex items-center justify-center gap-5 font-hand text-[1.4rem] leading-none xl:gap-7">
                  {items.map((i) => (
                    <li key={i.key} className="group relative">
                      <Link href={i.href} aria-haspopup={hasChildren(i) ? "true" : undefined} className={cx("scribble-link inline-block py-1", i.sale && "text-sale")}>
                        {i.label}
                      </Link>
                      {hasChildren(i) && <DropList item={i} className="left-1/2 -translate-x-1/2 pt-3" panelClassName="paper-note p-5 font-sans text-[15px]" />}
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="ml-auto lg:ml-0"><HeaderActions /></div>
            </div>
          </header>
        </>
      );

    case "slab":
      return (
        <>
          {bar}
          <header className="sticky top-0 z-40 px-2 pt-2 sm:px-4 sm:pt-3">
            <div className="slab mx-auto flex h-14 max-w-7xl items-center gap-3 rounded-[18px] px-3 sm:h-16 sm:px-5">
              <div className="lg:hidden">{menu}</div>
              <Logo settings={settings} variant="slab" />
              <nav aria-label="Main" className="hidden flex-1 lg:block">
                <ul className="flex items-center justify-center gap-0.5 text-[13px] font-semibold">
                  {items.map((i) => (
                    <li key={i.key} className="group relative">
                      <Link
                        href={i.href}
                        aria-haspopup={hasChildren(i) ? "true" : undefined}
                        className={cx("lift-link inline-flex h-10 items-center rounded-full px-3 whitespace-nowrap xl:px-3.5", i.sale && "text-sale")}
                      >
                        {i.label}
                      </Link>
                      {hasChildren(i) && <DropList item={i} className="left-1/2 -translate-x-1/2 pt-3" panelClassName="slab rounded-card p-5" />}
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="ml-auto lg:ml-0"><HeaderActions /></div>
            </div>
          </header>
        </>
      );

    case "pillow":
      return (
        <>
          {bar}
          <header className="sticky top-0 z-40 px-2 pt-2 sm:px-4 sm:pt-3">
            <div className="pillow mx-auto flex h-14 max-w-7xl items-center gap-3 rounded-full px-4 sm:h-16 sm:px-6">
              <div className="lg:hidden">{menu}</div>
              <Logo settings={settings} variant="pillow" />
              <nav aria-label="Main" className="hidden flex-1 lg:block">
                <ul className="flex items-center justify-center gap-1 text-[14px] font-bold">
                  {items.map((i) => (
                    <li key={i.key} className="group relative">
                      <Link
                        href={i.href}
                        aria-haspopup={hasChildren(i) ? "true" : undefined}
                        className={cx("puff-chip inline-flex h-10 items-center rounded-full px-3.5 whitespace-nowrap", i.sale && "text-sale")}
                      >
                        {i.label}
                      </Link>
                      {hasChildren(i) && <DropList item={i} className="left-1/2 -translate-x-1/2 pt-3" panelClassName="clay-panel rounded-[28px] p-5" />}
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="ml-auto lg:ml-0"><HeaderActions /></div>
            </div>
          </header>
        </>
      );

    case "frost":
      return (
        <>
          {bar}
          <header className="frost sticky top-0 z-40">
            <div className="container-page flex h-16 items-center gap-4 lg:h-[4.5rem]">
              <div className="lg:hidden">{menu}</div>
              <Logo settings={settings} variant="frost" />
              <nav aria-label="Main" className="hidden flex-1 lg:block">
                <ul className="flex items-center justify-center gap-5 text-[13px] font-medium tracking-wide xl:gap-7">
                  {items.map((i) => (
                    <li key={i.key} className="group relative">
                      <Link href={i.href} aria-haspopup={hasChildren(i) ? "true" : undefined} className={cx("beam-link inline-block py-2", i.sale && "text-sale")}>
                        {i.label}
                      </Link>
                      {hasChildren(i) && <DropList item={i} className="left-1/2 -translate-x-1/2 pt-3" panelClassName="frost-panel rounded-card p-5" />}
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="ml-auto lg:ml-0"><HeaderActions /></div>
            </div>
          </header>
        </>
      );

    case "cabinet":
      return (
        <>
          {bar}
          <header className="cabinet sticky top-0 z-40">
            <div className="container-page flex h-16 items-center gap-4">
              <div className="lg:hidden">{menu}</div>
              <Logo settings={settings} variant="cabinet" />
              <nav aria-label="Main" className="hidden flex-1 lg:block">
                <ul className="flex items-center justify-center gap-1 font-pixel text-[11px] uppercase">
                  {items.map((i) => (
                    <li key={i.key} className="group relative">
                      <Link
                        href={i.href}
                        aria-haspopup={hasChildren(i) ? "true" : undefined}
                        className={cx("arcade-link inline-flex h-9 items-center px-3 whitespace-nowrap", i.sale && "text-sale")}
                      >
                        {i.label}
                      </Link>
                      {hasChildren(i) && <DropList item={i} className="left-1/2 -translate-x-1/2 pt-3" panelClassName="cabinet-panel rounded-card p-5 font-sans normal-case" />}
                    </li>
                  ))}
                </ul>
              </nav>
              <span aria-hidden className="insert-coin hidden font-pixel text-[10px] uppercase xl:inline">Insert coin</span>
              <div className="ml-auto lg:ml-0"><HeaderActions /></div>
            </div>
          </header>
        </>
      );

    case "letterhead":
      return (
        <>
          {bar}
          <header className="sticky top-0 z-40 bg-ivory/95 backdrop-blur supports-[backdrop-filter]:bg-ivory/90">
            <div className="container-page letterhead flex h-16 items-center gap-4 lg:h-[4.5rem]">
              <div className="lg:hidden">{menu}</div>
              <Logo settings={settings} variant="letterhead" />
              <nav aria-label="Main" className="hidden flex-1 lg:block">
                <ul className="flex items-center justify-end gap-6 text-[11px] tracking-[0.24em] uppercase xl:gap-8">
                  {items.map((i) => (
                    <li key={i.key} className="group relative">
                      <Link
                        href={i.href}
                        aria-haspopup={hasChildren(i) ? "true" : undefined}
                        className={cx("gallery-link inline-block py-2 whitespace-nowrap", i.sale && "text-sale")}
                      >
                        {i.label}
                      </Link>
                      {hasChildren(i) && <DropList item={i} className="left-1/2 -translate-x-1/2 pt-3" panelClassName="border border-line bg-paper p-5 normal-case tracking-normal shadow-xl" />}
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="ml-auto lg:ml-0"><HeaderActions /></div>
            </div>
          </header>
        </>
      );

    case "fold":
      return (
        <>
          {bar}
          <header className="sticky top-0 z-40 px-2 pt-2 sm:px-4">
            <div className="fold-paper mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:h-16 sm:px-6">
              <div className="lg:hidden">{menu}</div>
              <Logo settings={settings} variant="fold" />
              <nav aria-label="Main" className="hidden flex-1 lg:block">
                <ul className="flex items-center justify-center gap-1 text-[14px] font-semibold">
                  {items.map((i) => (
                    <li key={i.key} className="group relative">
                      <Link
                        href={i.href}
                        aria-haspopup={hasChildren(i) ? "true" : undefined}
                        className={cx("paper-tab inline-flex h-10 items-center px-3.5 whitespace-nowrap", i.sale && "text-sale")}
                      >
                        {i.label}
                      </Link>
                      {hasChildren(i) && <DropList item={i} className="left-1/2 -translate-x-1/2 pt-3" panelClassName="fold-paper p-5" />}
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="ml-auto lg:ml-0"><HeaderActions /></div>
            </div>
          </header>
        </>
      );

    case "keycaps":
      return (
        <>
          {bar}
          <header className="sticky top-0 z-40 border-b border-line bg-ivory/95 backdrop-blur supports-[backdrop-filter]:bg-ivory/90">
            <div className="container-page flex h-16 items-center gap-4 lg:h-[4.5rem]">
              <div className="lg:hidden">{menu}</div>
              <Logo settings={settings} variant="keycaps" className="keycap inline-flex items-center px-3 py-1.5" />
              <nav aria-label="Main" className="hidden flex-1 lg:block">
                <ul className="flex items-center justify-center gap-2 text-[12px] font-semibold">
                  {items.map((i) => (
                    <li key={i.key} className="group relative">
                      <Link
                        href={i.href}
                        aria-haspopup={hasChildren(i) ? "true" : undefined}
                        className={cx("keycap inline-flex h-9 items-center px-3 whitespace-nowrap", i.sale && "text-sale")}
                      >
                        {i.label}
                      </Link>
                      {hasChildren(i) && <DropList item={i} className="left-1/2 -translate-x-1/2 pt-3" panelClassName="keycap-panel rounded-card p-5" />}
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="ml-auto lg:ml-0"><HeaderActions /></div>
            </div>
          </header>
        </>
      );

    case "segmented":
      return (
        <>
          {bar}
          <header className="sticky top-0 z-40 bg-ivory/90 backdrop-blur supports-[backdrop-filter]:bg-ivory/80">
            <div className="container-page flex h-16 items-center gap-4 lg:h-[4.5rem]">
              <div className="lg:hidden">{menu}</div>
              <Logo settings={settings} variant="segmented" />
              <nav aria-label="Main" className="hidden flex-1 lg:block">
                <ul className="segmented mx-auto flex w-fit items-center gap-0.5 rounded-full p-1 text-[13px] font-semibold">
                  {items.map((i) => (
                    <li key={i.key} className="group relative">
                      <Link
                        href={i.href}
                        aria-haspopup={hasChildren(i) ? "true" : undefined}
                        className={cx("seg-link inline-flex h-9 items-center rounded-full px-3.5 whitespace-nowrap", i.sale && "text-sale")}
                      >
                        {i.label}
                      </Link>
                      {hasChildren(i) && <DropList item={i} className="left-1/2 -translate-x-1/2 pt-3" panelClassName="rounded-card border border-line bg-paper p-5 shadow-xl" />}
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="ml-auto lg:ml-0"><HeaderActions /></div>
            </div>
          </header>
        </>
      );

    case "metal":
      return (
        <>
          {bar}
          <header className="sticky top-0 z-40 px-2 pt-2 sm:px-4 sm:pt-3">
            <div className="metal-bar mx-auto flex h-14 max-w-7xl items-center gap-4 rounded-full px-4 sm:h-16 sm:px-6">
              <div className="lg:hidden">{menu}</div>
              <Logo settings={settings} variant="metal" />
              <nav aria-label="Main" className="hidden flex-1 lg:block">
                <ul className="flex items-center justify-center gap-1 text-[13px] font-semibold">
                  {items.map((i) => (
                    <li key={i.key} className="group relative">
                      <Link
                        href={i.href}
                        aria-haspopup={hasChildren(i) ? "true" : undefined}
                        className={cx("metal-link inline-flex h-9 items-center rounded-full px-3.5 whitespace-nowrap", i.sale && "text-sale")}
                      >
                        {i.label}
                      </Link>
                      {hasChildren(i) && <DropList item={i} className="left-1/2 -translate-x-1/2 pt-3" panelClassName="metal-panel rounded-card p-5" />}
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="ml-auto lg:ml-0"><HeaderActions /></div>
            </div>
          </header>
        </>
      );

    case "club": {
      // The menu split around a centred crest, between gilt rules, like a club's letterhead.
      const half = Math.ceil(items.length / 2);
      const link = (i: NavItem) => (
        <li key={i.key} className="group relative">
          <Link
            href={i.href}
            aria-haspopup={hasChildren(i) ? "true" : undefined}
            className={cx("club-link inline-block py-2 whitespace-nowrap", i.sale && "text-sale")}
          >
            {i.label}
          </Link>
          {hasChildren(i) && <DropList item={i} className="left-1/2 -translate-x-1/2 pt-3" panelClassName="club-panel p-5 normal-case tracking-normal" />}
        </li>
      );
      return (
        <>
          {bar}
          <header className="club-bar sticky top-0 z-40 bg-ivory/95 backdrop-blur supports-[backdrop-filter]:bg-ivory/90">
            <div className="container-page grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 lg:h-[4.75rem]">
              <div className="flex items-center gap-4">
                <div className="lg:hidden">{menu}</div>
                <div className="hidden items-center gap-5 text-[10px] tracking-[0.26em] text-taupe uppercase lg:flex">
                  <Link href="/orders/lookup" className="hover:text-ink">Track order</Link>
                  <Link href="/contact" className="hover:text-ink">Help</Link>
                </div>
              </div>
              <div className="flex items-center gap-3 justify-self-center">
                {!settings.logo_url && <span aria-hidden className="club-crest hidden font-serif sm:grid">{monogram(settings.store_name)}</span>}
                <Logo settings={settings} variant="club" />
              </div>
              <HeaderActions />
            </div>
            <nav aria-label="Main" className="club-nav hidden lg:block">
              <div className="container-page flex items-center justify-center gap-8 text-[11px] tracking-[0.24em] uppercase xl:gap-10">
                <ul className="flex items-center gap-7 xl:gap-9">{items.slice(0, half).map(link)}</ul>
                <span aria-hidden className="club-fleuron text-accent">❦</span>
                <ul className="flex items-center gap-7 xl:gap-9">{items.slice(half).map(link)}</ul>
              </div>
            </nav>
          </header>
        </>
      );
    }

    case "overlay":
      return (
        <OverlayHeader overlayOnHome={overlayHero} onPhoto={design.hero !== "glow"} top={bar}>
          <div className="container-page grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 lg:h-20">
            <div><MobileMenu departments={departments} storeName={settings.store_name} variant="full" /></div>
            <Logo settings={settings} variant="overlay" className="justify-self-center" />
            <HeaderActions />
          </div>
        </OverlayHeader>
      );

    default:
      return (
        <>
          {bar}
          <header className="sticky top-0 z-40 border-b border-line bg-ivory/95 backdrop-blur supports-[backdrop-filter]:bg-ivory/85">
            <div className="container-page grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 lg:h-[4.5rem]">
              <div className="flex items-center gap-4">
                <div className="lg:hidden">{menu}</div>
                <div className="hidden items-center gap-5 text-xs text-taupe lg:flex">
                  <Link href="/orders/lookup" className="hover:text-ink">Track order</Link>
                  <Link href="/contact" className="hover:text-ink">Help</Link>
                </div>
              </div>
              <Logo settings={settings} className="justify-self-center" />
              <HeaderActions />
            </div>
            <nav aria-label="Main" className="hidden border-t border-line/70 lg:block">
              <ul className="flex items-center justify-center gap-9 text-[12px] tracking-[0.12em] uppercase">
                {items.map((i) => (
                  <li key={i.key} className="group static">
                    <Link href={i.href} aria-haspopup={hasChildren(i) ? "true" : undefined} className={cx("flex h-12 items-center gap-1", i.sale ? "text-sale hover:opacity-80" : "hover:text-accent")}>
                      {i.label}
                      <Chevron item={i} />
                    </Link>
                    {hasChildren(i) && <MegaPanel d={i.department!} />}
                  </li>
                ))}
              </ul>
            </nav>
          </header>
        </>
      );
  }
}
