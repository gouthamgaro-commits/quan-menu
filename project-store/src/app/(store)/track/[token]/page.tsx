import { Check, Download, HandCoins, Hourglass, Info, MessageCircle, MessagesSquare, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { studentAnswerOffer, studentMessage } from "@/app/(store)/actions";
import AutoRefresh from "@/components/AutoRefresh";
import ChatComposer from "@/components/ChatComposer";
import CopyButton from "@/components/CopyButton";
import { WhatsAppIcon } from "@/components/Icons";
import { RememberOrder } from "@/components/LocalOrders";
import PayPanel from "@/components/PayPanel";
import ScrollTop from "@/components/ScrollTop";
import Thread from "@/components/Thread";
import { Meter, StatusBadge } from "@/components/Ui";
import { categoryName, type Status } from "@/lib/catalog";
import { getOrderByToken, getSettings, listMessages, listPayments } from "@/lib/data";
import { approx, dateIN, dateTimeIN, inr } from "@/lib/format";
import { getFx, paypalAmount } from "@/lib/fx";
import { waLink } from "@/lib/links";
import { money } from "@/lib/money";
import { minOffer } from "@/lib/pricing";
import { siteUrl } from "@/lib/site";
import type { Message } from "@/lib/types";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

const STEP_AT: Record<Status, number> = { requested: 0, quoted: 1, in_progress: 2, ready: 3, delivered: 5, cancelled: -1 };

function AnswerButtons({ token, m }: { token: string; m: Message }) {
  return (
    <div className="offer-actions">
      <form action={studentAnswerOffer}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="message" value={m.id} />
        <input type="hidden" name="answer" value="accept" />
        <button className="btn btn-primary btn-sm" type="submit">
          <Check size={15} aria-hidden /> accept {m.offer != null ? inr(m.offer) : ""}
        </button>
      </form>
      <form action={studentAnswerOffer}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="message" value={m.id} />
        <input type="hidden" name="answer" value="decline" />
        <button className="btn btn-sm" type="submit">
          <X size={15} aria-hidden /> nah
        </button>
      </form>
      <a href="#chat" className="btn btn-ghost btn-sm">
        <HandCoins size={15} aria-hidden /> counter-offer
      </a>
    </div>
  );
}

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
  const [s, payments, messages, base] = await Promise.all([getSettings(), listPayments(o.id), listMessages(o.id), siteUrl()]);
  const m = money(o);
  const fx = await getFx(s.localCurrency);
  const pp = s.paypalMe && m.dueNow > 0 ? { user: s.paypalMe, ...(await paypalAmount(m.dueNow)) } : null;
  const canPay = !!(s.upiId || pp || s.payLink || s.otherPay);
  const link = `${base}/track/${o.token}`;
  const at = STEP_AT[o.status];
  const custom = o.kind === "custom";
  const openOwnerOffer = [...messages].reverse().find((x) => x.offerStatus === "open" && x.sender === "owner");
  const myOpenOffer = [...messages].reverse().find((x) => x.offerStatus === "open" && x.sender === "student");
  const canNegotiate = s.negotiable && ["requested", "quoted"].includes(o.status) && o.paid === 0;
  const reference = o.details.listPrice ?? o.price ?? o.estimateLow ?? 0;
  const floor = reference ? minOffer(reference, s.minOfferPercent) : 0;
  const offerSent = isNew && !!myOpenOffer;

  const waText =
    isNew && offerSent
      ? `Hey ${s.brandName}! I just sent an offer of ${inr(myOpenOffer!.offer)} for “${o.title}” (order ${o.code}) 🎯 ${link}`
      : isNew && custom
        ? `Hey ${s.brandName}! I just pitched my project idea “${o.title}” (order ${o.code}) 💡 ${link}`
        : isNew
          ? `Hey ${s.brandName}! I just ordered “${o.title}” (order ${o.code}) 🔒 ${link}`
          : `Hey ${s.brandName}! Quick question about my order ${o.code} (“${o.title}”): `;
  const wa = s.whatsapp ? waLink(s.whatsapp, waText) : "";

  const steps = [
    { title: "price agreed 🤝", sub: o.price != null ? inr(o.price) : "haggling…" },
    { title: "advance paid 💸", sub: m.advance ? inr(m.advance) : "" },
    { title: "cooking 🧑‍🍳", sub: o.deadline ? `for ${dateIN(o.deadline)}` : "we'll keep you posted" },
    { title: "demo time 👀", sub: "see it working" },
    { title: "delivered 🎉", sub: "code, docs & slides" },
  ];
  const addons = o.details.addons ?? [];

  return (
    <main className="container narrow page stack">
      <RememberOrder code={o.code} token={o.token} title={o.title} />
      {isNew && <ScrollTop />}
      {o.status !== "delivered" && o.status !== "cancelled" && <AutoRefresh seconds={12} />}

      {isNew && (
        <section className="success-burst">
          <h2>
            {offerSent ? "offer sent 🎯" : custom ? "idea received 💡" : "you're in 🎉"}
          </h2>
          <p>
            {offerSent
              ? "We'll reply to your offer right here, usually within a few hours. This page updates by itself, no need to refresh."
              : custom
                ? "We'll check out your idea and reply here with a price, usually within a few hours."
                : `Pay the ${inr(m.advance)} advance below and we start cooking. Bookmark this page, it's your order's home (or find it later under Track).`}
          </p>
          <div className="row">
            {wa && (
              <a href={wa} className="btn btn-wa" target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon /> ping us on WhatsApp
              </a>
            )}
            <CopyButton text={link} label="copy order link" className="btn" />
          </div>
        </section>
      )}

      {openOwnerOffer && canNegotiate && (
        <section className="offer-banner">
          <span className="sticker white">new offer for you 👀</span>
          <span className="ob-price">{inr(openOwnerOffer.offer)}</span>
          {openOwnerOffer.body && <p className="small">{openOwnerOffer.body}</p>}
          <AnswerButtons token={o.token} m={openOwnerOffer} />
        </section>
      )}

      <section className="card card-pad stack">
        <div className="row between top">
          <div className="stack-xs grow">
            <span className="small muted">
              Order <span className="code-box">{o.code}</span> · {dateTimeIN(o.createdAt)}
            </span>
            <h1 style={{ fontSize: "clamp(22px, 4vw, 30px)" }}>{o.title}</h1>
          </div>
          <StatusBadge status={o.status} student />
        </div>
        {o.status === "cancelled" ? (
          <div className="notice">
            <Info size={18} aria-hidden /> This order was cancelled. DM us on WhatsApp if that&apos;s a mistake.
          </div>
        ) : (
          <ol className="progress" aria-label="Order progress">
            {steps.map((st, i) => {
              const done = i < at;
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
            <b>from us: </b>
            {o.noteForStudent}
          </span>
        </section>
      )}

      {o.status === "delivered" && o.deliveryLink && (
        <section className="card card-pad stack-sm" style={{ background: "var(--lime)" }}>
          <h2 className="card-title">it&apos;s ready. go get it 🏆</h2>
          <p className="muted">Source code, docs, slides and everything in your order.</p>
          <div>
            <a href={o.deliveryLink} className="btn btn-primary btn-lg" target="_blank" rel="noopener noreferrer">
              <Download size={18} aria-hidden /> download project files
            </a>
          </div>
        </section>
      )}

      {m.dueNow > 0 && (
        <section className="card card-pad stack">
          <h2 className="card-title">{m.advancePaid ? "pay the rest 💸" : "pay to start 💸"}</h2>
          {o.pending > 0 && (
            <div className="notice warn">
              <Hourglass size={18} aria-hidden /> We're checking a payment of {inr(o.pending)} you told us about.
            </div>
          )}
          {canPay ? (
            <PayPanel
              token={o.token}
              code={o.code}
              amount={m.dueNow}
              label={m.dueLabel}
              approxText={approx(m.dueNow, fx)}
              upi={s.upiId ? { id: s.upiId, name: s.upiName || s.brandName } : null}
              paypal={pp}
              card={s.payLink || s.otherPay ? { link: s.payLink, text: s.otherPay } : null}
              preferAbroad={!!fx}
            />
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
        <div className="stack-xs">
          <h2 className="card-title">
            <MessagesSquare size={20} aria-hidden /> chat with us 💬
          </h2>
          <p className="small muted">
            {canNegotiate
              ? "Ask anything, or make an offer on the price. We usually reply within a few hours."
              : "Questions about your project? Drop them here and we'll reply on this page."}
          </p>
        </div>
        {o.status === "requested" && o.price == null && !messages.some((x) => x.offer) && o.estimateLow != null && (
          <div className="notice info">
            <Info size={18} aria-hidden />
            <span>
              Typical price for this idea: <b>{inr(o.estimateLow)} – {inr(o.estimateHigh)}</b>
              {fx ? ` (${approx(o.estimateLow, fx)} – ${approx(o.estimateHigh, fx).replace("≈ ", "")})` : ""}. Nothing to pay yet. Make an offer below, or wait for our price.
            </span>
          </div>
        )}
        <Thread
          messages={messages}
          viewer="student"
          names={{ student: o.studentName, owner: s.brandName }}
          listPrice={o.details.listPrice ?? null}
          answer={(msg) => (canNegotiate ? <AnswerButtons token={o.token} m={msg} /> : null)}
        />
        <ChatComposer
          action={studentMessage}
          hidden={{ token: o.token }}
          allowOffer={canNegotiate}
          offerHint={floor ? `Offers from ${inr(floor)} are considered.` : undefined}
          placeholder={canNegotiate ? "e.g. can you include the viva prep call at this price? 🙏" : "write a message…"}
        />
      </section>

      <section className="card card-pad stack">
        <h2 className="card-title">order details 🧾</h2>
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
          {o.details.listPrice != null && (
            <>
              <dt>Listed price</dt>
              <dd>{inr(o.details.listPrice)}</dd>
            </>
          )}
          <dt>Agreed price</dt>
          <dd>{o.price != null ? <b>{inr(o.price)}</b> : <span className="muted">Not agreed yet</span>}</dd>
          {o.price != null && (
            <>
              <dt>Paid</dt>
              <dd>
                {inr(o.paid)}
                {m.fullyPaid ? (
                  <span className="badge tone-green" style={{ marginLeft: 8 }}>
                    Fully paid
                  </span>
                ) : (
                  ` of ${inr(o.price)}`
                )}
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
          <WhatsAppIcon /> prefer WhatsApp? DM us
        </a>
      )}
    </main>
  );
}
