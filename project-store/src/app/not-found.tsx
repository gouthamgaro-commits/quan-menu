import Link from "next/link";

export default function NotFound() {
  return (
    <div className="store">
      <main className="login-wrap">
        <div className="card login-card" style={{ textAlign: "center", justifyItems: "center" }}>
          <span style={{ fontSize: 56, lineHeight: 1 }} aria-hidden>
            🫠
          </span>
          <h1 style={{ fontSize: 34 }}>404: this page ghosted you</h1>
          <p className="muted">The link might be old, or the project isn&apos;t listed anymore.</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link href="/projects" className="btn btn-primary">
              browse projects
            </Link>
            <Link href="/track" className="btn">
              track an order
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
