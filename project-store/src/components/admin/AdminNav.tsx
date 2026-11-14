"use client";
import { FolderKanban, Gauge, ListOrdered, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav({ attention }: { attention: number }) {
  const path = usePathname();
  const links = [
    { href: "/admin", label: "Dashboard", icon: Gauge, exact: true },
    { href: "/admin/orders", label: "Orders", icon: ListOrdered, badge: attention },
    { href: "/admin/projects", label: "Projects", icon: FolderKanban },
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
