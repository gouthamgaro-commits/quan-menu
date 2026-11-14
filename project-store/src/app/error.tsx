"use client";
import { RotateCcw } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="login-wrap">
      <div className="card login-card" style={{ textAlign: "center", justifyItems: "center" }}>
        <h1 style={{ fontSize: 24 }}>Something went wrong</h1>
        <p className="muted">Please try again in a moment. If it keeps happening, message us on WhatsApp.</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <button type="button" className="btn btn-primary" onClick={reset}>
            <RotateCcw size={16} aria-hidden /> Try again
          </button>
          <Link href="/" className="btn">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
