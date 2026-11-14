import { Check, CircleCheck, Download, Hourglass, Info, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CopyButton from "@/components/CopyButton";
import { WhatsAppIcon } from "@/components/Icons";
import { RememberOrder } from "@/components/LocalOrders";
import PayPanel from "@/components/PayPanel";
import { Meter, StatusBadge } from "@/components/Ui";
import { categoryName, type Status } from "@/lib/catalog";
import { getOrderByToken, getSettings, listPayments } from "@/lib/data";
import { dateIN, dateTimeIN, inr } from "@/lib/format";
import { waLink } from "@/lib/links";
import { money } from "@/lib/money";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

const STEP_AT: Record<Status, number> = { requested: 0, quoted: 1, in_progress: 2, ready: 3, delivered: 5, cancelled: -1 };

export default async function TrackOrder({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const isNew = (await searchParams).new === "1";
  const o = await getOrderByToken(token);
  if (!o) notFound();
  const [s, payments, base] = await Promise.all([getSettings(), listPayments(o.id), siteUrl()]);
  const m = money(o);
  const link = `${base}/track/${o.token}`;
  const at = STEP_AT[o.status];
  const custom = o.kind === "custom";

  const waText =
    isNew && custom
      ? `Hi ${s.brandName}! I just sent my project idea “${o.title}” (order ${o.code}). My order page: ${link}`
      : isNew
        ? `Hi ${s.brandName}! I just ordered “${o.title}” (order ${o.code}). My order page: ${link}`
        : `Hi ${s.brandName}! A question about my order ${o.code} (“${o.title}”): `;
  const wa = s.whatsapp ? waLink(s.whatsapp, waText) : "";

  const steps = [
    {
      title: custom ? "Price confirmed" : "Order placed",
      sub: o.price != null ? inr(o.price) : "Usually within a few hours",
    },
    { title: "Advance paid", sub: m.advance ? inr(m.advance) : "" },
    { title: "Being built", sub: o.deadline ? `For ${dateIN(o.deadline)}` : "We'll keep you posted" },
    { title: "Demo ready", sub: "See it working" },
    { title: "Delivered", sub: "Code, report & PPT" },
  ];
  const addons = o.details.addons ?? [];

  return (
    <main className="container narrow page stack">
      <RememberOrder code={o.code} token={o.token} title={o.title} />

      {isNew && (
        <section className="success-burst">
          <h2>
            <CircleCheck size={24} aria-hidden /> {custom ? "Idea received!" : "Order placed!"}
          </h2>
          <p>
            {custom
              ? "We'll check your idea and confirm the final price here and on WhatsApp, usually within a few hours."
              : `Pay the ${inr(m.advance)} advance below to start. This page is your order's home: bookmark it, or find it later under Track.`}
          </p>
          <div className="row">
            {wa && (
              <a href={wa} className="btn btn-wa" target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon /> Send it to us on WhatsApp
              </a>
            )}
            <CopyButton text={link} label="Copy order link" className="btn" />
          </div>
        </section>
      )}

      <section className="card card-pad stack">
        <div className="row between top">
          <div className="stack-xs grow">
            <span className="small muted">
              Order <span className="code-box">{o.code}</span> · {dateTimeIN(o.createdAt)}
            </span>
            <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)" }}>{o.title}</h1>
          </div>
          <StatusBadge status={o.status} student />
        </div>
        {o.status === "cancelled" ? (
          <div className="notice">
            <Info size={18} aria-hidden /> This order was cancelled. Message us on WhatsApp if that's a mistake.
          </div>
        ) : (
          <ol className="progress" aria-label="Order progress">
            {steps.map((st, i) => {
              const done = i < at || (i === 0 && !custom);
              const now = !done && i === at;
              return (
                <li key={st.title} className={done ? "done" : now ? "now" : ""} aria-current={now ? "step" : undefined}>
                  <span className="dot">{done ? <Check size={15} aria-hidden /> : now ? <Hourglass size={13} aria-hidden /> : i + 1}</span>
                  <span>
                    <b>{st.title}</b>
                    <small>{st.sub}</small>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {o.noteForStudent && (
        <section className="notice info">
          <MessageCircle size={18} aria-hidden />
          <span style={{ whiteSpace: "pre-line" }}>
            <b>Message from us: </b>
            {o.noteForStudent}
          </span>
        </section>
      )}

      {o.status === "delivered" && o.deliveryLink && (
        <section className="card card-pad stack-sm">
          <h2 style={{ fontSize: 20 }}>Your project is ready to download</h2>
          <p className="muted">Source code, report, slides and everything listed in your order.</p>
          <div>
            <a href={o.deliveryLink} className="btn btn-primary btn-lg" target="_blank" rel="noopener noreferrer">
              <Download size={18} aria-hidden /> Download project files
            </a>
          </div>
        </section>
      )}

      {o.status === "requested" && (
        <section className="card card-pad stack-sm">
          <h2 style={{ fontSize: 20 }}>Your estimate</h2>
          {o.estimateLow != null && o.estimateHigh != null && (
            <span className="price-lg">
              {inr(o.estimateLow)} – {inr(o.estimateHigh)}
            </span>
          )}
          <p className="muted">
            Nothing to pay yet. Once we confirm the price, this page shows the amount and a UPI QR code for the{" "}
            {o.advancePercent}% advance.
          </p>
        </section>
      )}

      {m.dueNow > 0 && (
        <section className="card card-pad stack">
          <h2 style={{ fontSize: 20 }}>{m.advancePaid ? "Pay the balance" : "Pay to start"}</h2>
          {o.pending > 0 && (
            <div className="notice warn">
              <Hourglass size={18} aria-hidden /> We're checking a payment of {inr(o.pending)} you told us about.
            </div>
          )}
          {s.upiId ? (
            <PayPanel token={o.token} code={o.code} upiId={s.upiId} upiName={s.upiName || s.brandName} amount={m.dueNow} label={m.dueLabel} />
          ) : (
            <div className="notice info">
              <Info size={18} aria-hidden />
              <span>
                {m.dueLabel}: <b>{inr(m.dueNow)}</b>. Message us on WhatsApp for payment details.
              </span>
            </div>
          )}
        </section>
      )}

      <section className="card card-pad stack">
        <h2 style={{ fontSize: 20 }}>Order details</h2>
        <dl className="kv">
          {o.kind === "catalog" && o.projectSlug && (
            <>
              <dt>Project</dt>
              <dd>
                <Link href={`/projects/${o.projectSlug}`}>{o.title}</Link>
              </dd>
            </>
          )}
          {custom && o.details.category && (
            <>
              <dt>Domain</dt>
              <dd>{categoryName(o.details.category)}</dd>
              <dt>Difficulty</dt>
              <dd>
                <Meter level={o.details.difficulty ?? 2} />
              </dd>
            </>
          )}
          {addons.length > 0 && (
            <>
              <dt>Extras</dt>
              <dd>{addons.map((a) => a.name).join(", ")}</dd>
            </>
          )}
          {o.deadline && (
            <>
              <dt>Needed by</dt>
              <dd>{dateIN(o.deadline)}</dd>
            </>
          )}
          <dt>Price</dt>
          <dd>{o.price != null ? <b>{inr(o.price)}</b> : <span className="muted">To be confirmed</span>}</dd>
          {o.price != null && (
            <>
              <dt>Paid</dt>
              <dd>
                {inr(o.paid)}
                {m.fullyPaid ? <span className="badge tone-green" style={{ marginLeft: 8 }}>Fully paid</span> : ` of ${inr(o.price)}`}
              </dd>
            </>
          )}
          <dt>Name</dt>
          <dd>
            {o.studentName}
            {o.college ? ` · ${o.college}` : ""}
          </dd>
        </dl>
        {custom && o.details.idea && (
          <details>
            <summary className="small strong" style={{ cursor: "pointer" }}>
              Your idea as you described it
            </summary>
            <p className="small" style={{ whiteSpace: "pre-line", marginTop: 8 }}>
              {o.details.idea}
            </p>
          </details>
        )}
        {o.details.notes && (
          <p className="small" style={{ whiteSpace: "pre-line" }}>
            <b>Your notes: </b>
            {o.details.notes}
          </p>
        )}
        {payments.length > 0 && (
          <div className="stack-sm">
            <b>Payments</b>
            <ul className="plist">
              {payments.map((p) => (
                <li key={p.id}>
                  <span>
                    <b>{inr(p.amount)}</b> <span className="muted small">· {dateTimeIN(p.createdAt)}</span>
                    {p.utr && <span className="muted small mono"> · {p.utr}</span>}
                  </span>
                  <span className={`badge ${p.status === "verified" ? "tone-green" : p.status === "rejected" ? "tone-red" : "tone-amber"}`}>
                    {p.status === "verified" ? "Received" : p.status === "rejected" ? "Not found, message us" : "Checking"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {wa && !isNew && (
        <a href={wa} className="btn btn-wa btn-lg" target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon /> Questions? Chat with us
        </a>
      )}
    </main>
  );
}
