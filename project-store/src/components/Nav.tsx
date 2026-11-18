"use client";
import { House, LayoutGrid, Lightbulb, PackageSearch } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "home", icon: House },
  { href: "/projects", label: "projects", icon: LayoutGrid },
  { href: "/custom", label: "pitch", icon: Lightbulb },
  { href: "/track", label: "track", icon: PackageSearch },
];
const TOP_LABELS: Record<string, string> = { "/projects": "browse projects", "/custom": "pitch your idea 💡", "/track": "track order" };

function active(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

export function TopNav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {LINKS.slice(1).map((l) => (
        <Link key={l.href} href={l.href} aria-current={active(path, l.href) ? "page" : undefined}>
          {TOP_LABELS[l.href] ?? l.label}
        </Link>
      ))}
    </nav>
  );
}

/** Bottom tab bar on phones, so the site feels like an app once installed. */
export function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar" aria-label="Main">
      {LINKS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} aria-current={active(path, href) ? "page" : undefined}>
          <Icon size={21} aria-hidden strokeWidth={2.4} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
