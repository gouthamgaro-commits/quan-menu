"use client";
import { RotateCcw } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="store">
      <main className="login-wrap">
        <div className="card login-card" style={{ textAlign: "center", justifyItems: "center" }}>
          <span style={{ fontSize: 56, lineHeight: 1 }} aria-hidden>
            😵‍💫
          </span>
          <h1 style={{ fontSize: 32 }}>oops, something broke</h1>
          <p className="muted">Give it another go in a sec. If it keeps happening, DM us on WhatsApp.</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <button type="button" className="btn btn-primary" onClick={reset}>
              <RotateCcw size={16} aria-hidden /> try again
            </button>
            <Link href="/" className="btn">
              home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
