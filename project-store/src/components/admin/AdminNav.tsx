"use client";
import { FolderKanban, Gauge, Gift, ListOrdered, Settings, Star } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav({ attention, reviews = 0, rewards = 0 }: { attention: number; reviews?: number; rewards?: number }) {
  const path = usePathname();
  const links = [
    { href: "/admin", label: "Dashboard", icon: Gauge, exact: true },
    { href: "/admin/orders", label: "Orders", icon: ListOrdered, badge: attention },
    { href: "/admin/projects", label: "Projects", icon: FolderKanban },
    { href: "/admin/reviews", label: "Reviews", icon: Star, badge: reviews },
    { href: "/admin/referrals", label: "Referrals", icon: Gift, badge: rewards },
    { href: "/admin/settings", label: "Settings & prices", icon: Settings },
  ];
  return (
    <nav className="admin-nav container" aria-label="Owner">
      {links.map(({ href, label, icon: Icon, exact, badge }) => {
        const on = exact ? path === href : path === href || path.startsWith(href + "/");
        return (
          <Link key={href} href={href} aria-current={on ? "page" : undefined}>
            <Icon size={17} aria-hidden /> {label}
            {badge ? <span className="count">{badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
