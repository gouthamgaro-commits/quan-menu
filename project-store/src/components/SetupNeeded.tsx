import { Database } from "lucide-react";

/** Shown instead of the site when a production deploy has no DATABASE_URL yet. */
export default function SetupNeeded() {
  return (
    <main className="login-wrap">
      <div className="card login-card">
        <span className="cat-icon cat-software lg">
          <Database size={24} aria-hidden />
        </span>
        <h1 style={{ fontSize: 24 }}>Almost there: connect the database</h1>
        <p className="muted">
          This site needs a Postgres database to save projects and orders. Add <code>DATABASE_URL</code> (and{" "}
          <code>ADMIN_PASSWORD</code>) in your hosting settings, then redeploy. The README in the project folder walks
          through it step by step with a free Supabase database.
        </p>
      </div>
    </main>
  );
}
