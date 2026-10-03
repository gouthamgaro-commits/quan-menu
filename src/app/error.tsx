"use client";

/** Shown instead of a blank screen when a page throws. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="page">
      <div className="card">
        <h1>Something went wrong</h1>
        <p>Please try again. If it keeps happening, reload the page.</p>
        <div className="row">
          <button className="btn primary" onClick={reset}>Try again</button>
          <a className="btn" href="/">Home</a>
        </div>
      </div>
    </main>
  );
}
