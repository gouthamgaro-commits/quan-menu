import { ExternalLink, LogOut } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";
import { LogoMark } from "@/components/Icons";
import SetupNeeded from "@/components/SetupNeeded";
import { requireAdmin } from "@/lib/admin";
import { getSettings, orderCounts } from "@/lib/data";
import { dbMode } from "@/lib/db";
import { logout } from "../actions";

export const metadata: Metadata = { title: "Owner", robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (dbMode() === "missing") return <SetupNeeded />;
  await requireAdmin();
  const [s, counts] = await Promise.all([getSettings(), orderCounts()]);

  return (
    <div className="admin-shell">
      <header className="admin-top">
        <div className="container admin-top-in">
          <Link href="/admin" className="logo">
            <span className="logo-mark">
              <LogoMark />
            </span>
            <span className="logo-name">{s.brandName}</span>
          </Link>
          <span className="chip">Owner</span>
          <div className="row" style={{ marginLeft: "auto", gap: 6 }}>
            <Link href="/" className="btn btn-ghost btn-sm" target="_blank">
              <ExternalLink size={15} aria-hidden /> <span>Store</span>
            </Link>
            <form action={logout}>
              <button className="btn btn-ghost btn-sm" type="submit" aria-label="Sign out">
                <LogOut size={15} aria-hidden />
              </button>
            </form>
          </div>
        </div>
        <AdminNav attention={(counts.requested ?? 0) + (counts.payments ?? 0)} />
      </header>
      <main className="container page stack-lg">{children}</main>
    </div>
  );
}
