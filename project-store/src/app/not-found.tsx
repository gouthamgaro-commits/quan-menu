import { SearchX } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="login-wrap">
      <div className="card login-card" style={{ textAlign: "center", justifyItems: "center" }}>
        <SearchX size={36} aria-hidden color="var(--muted)" />
        <h1 style={{ fontSize: 24 }}>Page not found</h1>
        <p className="muted">The link may be old, or the project is no longer listed.</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link href="/projects" className="btn btn-primary">
            Browse projects
          </Link>
          <Link href="/track" className="btn">
            Track an order
          </Link>
        </div>
      </div>
    </main>
  );
}
