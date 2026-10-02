import { DEMO } from "@/lib/config";

export default function Home() {
  return (
    <main className="page">
      <div className="wrap">
        <header className="top">
          <a className="logo" href="/">Quán<span>.</span></a>
          <a className="btn" href={DEMO ? "/dashboard" : "/login"}>{DEMO ? "Open editor" : "Sign in"}</a>
        </header>
        <section className="hero">
          <h1>Your menu, readable by every customer who walks past.</h1>
          <p>
            Take one photo of your menu. Quán turns it into a QR sticker that shows each dish in English, Korean,
            Chinese and Japanese, with what&apos;s in it, what it costs in their money, and how to say it.
          </p>
          <div className="row">
            <a className="btn primary" href={DEMO ? "/dashboard" : "/login"}>Make my menu</a>
            <a className="btn" href="/m/demo">See an example menu</a>
          </div>
        </section>
        <section className="how" aria-label="How it works">
          <div><b>1. Photograph</b><span>The board on the wall, a printed sheet, or handwriting. AI reads the dishes and prices.</span></div>
          <div><b>2. Check</b><span>Fix prices and allergens. You decide what customers see.</span></div>
          <div><b>3. Stick it up</b><span>Print the QR sticker. Change prices any time without reprinting.</span></div>
        </section>
      </div>
    </main>
  );
}
