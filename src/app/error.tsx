"use client";

/** Shown instead of a blank screen when a page throws. Bilingual: tourists can land here too. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="page">
      <div className="card">
        <h1>Có lỗi xảy ra · Something went wrong</h1>
        <p>Hãy thử lại. Nếu vẫn lỗi, tải lại trang.</p>
        <p lang="en">Please try again. If it keeps happening, reload the page.</p>
        <div className="row">
          <button className="btn primary" onClick={reset}>Thử lại · Try again</button>
          <a className="btn" href="/">Trang chủ · Home</a>
        </div>
      </div>
    </main>
  );
}
