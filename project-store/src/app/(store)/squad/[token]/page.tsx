import { Check, Hourglass, Info, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AutoRefresh from "@/components/AutoRefresh";
import { WhatsAppIcon } from "@/components/Icons";
import PayPanel from "@/components/PayPanel";
import { StatusBadge } from "@/components/Ui";
import { getSettings, getSquad, getSquadSeat, listPayments } from "@/lib/data";
import { approx, dateTimeIN, inr } from "@/lib/format";
import { getFx, paypalAmount } from "@/lib/fx";
import { waLink } from "@/lib/links";
import { money, seatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Your share", robots: { index: false, follow: false } };

/**
 * A teammate's own page for a squad order: their share, how to pay it, and who in the squad has
 * paid. It shows nothing private about the order (no chat, no phone numbers).
 */
export default async function SquadSeat({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await getSquadSeat(token);
  if (!found) notFound();
  const { member, order: o } = found;
  const [s, squad, payments] = await Promise.all([getSettings(), getSquad(o.id), listPayments(o.id)]);
  if (squad.length < 2 || !squad.some((x) => x.token === token)) notFound();
  const m = money(o);
  const me = seatMoney(o, squad.length, member.seat, payments);
  const fx = await getFx(s.localCurrency);
  const pp = s.paypalMe && me.dueNow > 0 ? { user: s.paypalMe, ...(await paypalAmount(me.dueNow)) } : null;
  const canPay = !!(s.upiId || pp || s.payLink || s.otherPay);
  const leader = squad.find((x) => x.seat === 1)?.name || o.studentName.split(/\s+/)[0];
  const mine = payments.filter((p) => p.seat === member.seat);
  const wa = s.whatsapp ? waLink(s.whatsapp, `Hey ${s.brandName}! I'm in ${leader}'s squad for “${o.title}” (order ${o.code}) and have a question 👋`) : "";

  return (
    <main className="container narrow page stack">
      {o.status !== "delivered" && o.status !== "cancelled" && <AutoRefresh seconds={20} />}
      <section className="card card-pad stack" style={{ background: "var(--yellow)" }}>
        <span className="sticker white">
          <Users size={14} aria-hidden /> squad of {squad.length}
        </span>
        <h1 style={{ fontSize: "clamp(24px, 5vw, 34px)" }}>hey {member.name || "there"} 👋</h1>
        <p>
          {leader} split <b>{o.title}</b> with the squad. This is your own link to pay your share.
        </p>
        <div className="row">
          <span className="small">
            Order <span className="code-box">{o.code}</span>
          </span>
          <StatusBadge status={o.status} student />
        </div>
      </section>

      {o.status === "cancelled" ? (
        <div className="notice">
          <Info size={18} aria-hidden /> This order was cancelled, so there&apos;s nothing to pay.
        </div>
      ) : o.price == null || o.status === "requested" ? (
        <div className="notice info">
          <Hourglass size={18} aria-hidden /> {leader} is still agreeing the price with us. Your share shows up here once it&apos;s set. This page
          updates by itself.
        </div>
      ) : me.dueNow > 0 ? (
        <section className="card card-pad stack">
          <h2 className="card-title">pay your share 💸</h2>
          {me.pending > 0 && (
            <div className="notice warn">
              <Hourglass size={18} aria-hidden /> We&apos;re checking a payment of {inr(me.pending)} you told us about.
            </div>
          )}
          {canPay ? (
            <PayPanel
              seatToken={member.token}
              code={o.code}
              amount={me.dueNow}
              label={me.dueLabel}
              approxText={approx(me.dueNow, fx)}
              upi={s.upiId ? { id: s.upiId, name: s.upiName || s.brandName } : null}
              paypal={pp}
              card={s.payLink || s.otherPay ? { link: s.payLink, text: s.otherPay } : null}
              preferAbroad={!!fx}
            />
          ) : (
            <div className="notice info">
              <Info size={18} aria-hidden />
              <span>
                {me.dueLabel}: <b>{inr(me.dueNow)}</b>. Message us on WhatsApp for payment details.
              </span>
            </div>
          )}
        </section>
      ) : (
        <section className="card card-pad stack-sm" style={{ background: "var(--lime)" }}>
          <h2 className="card-title">{me.done || m.fullyPaid ? "you're all paid up ✅" : "you're good for now ✅"}</h2>
          <p className="small">
            {me.done || m.fullyPaid
              ? "Nothing left for you to pay. We'll keep cooking and show the demo to the squad."
              : `Your part of the advance is in. The rest of your share (${inr(me.share - me.paid)}) is due after the demo.`}
          </p>
        </section>
      )}

      {o.price != null && (
        <section className="card card-pad stack">
          <h2 className="card-title">the squad 👯</h2>
          <ul className="squad-list">
            {squad.map((x) => {
              const sm = seatMoney(o, squad.length, x.seat, payments);
              return (
                <li key={x.seat} className={sm.done ? "paid" : ""}>
                  <span className="squad-who">
                    <span className="seat-dot" aria-hidden>
                      {sm.done ? <Check size={14} /> : x.seat}
                    </span>
                    <span className="stack-xs">
                      <b>
                        {x.name}
                        {x.seat === member.seat ? " (you)" : ""}
                      </b>
                      <span className="tiny muted">
                        share {inr(sm.share)} · {sm.done ? "paid ✅" : sm.paid > 0 ? `paid ${inr(sm.paid)}` : "not paid yet"}
                      </span>
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="tiny muted">
            Total {inr(m.price)} · paid so far {inr(o.paid)}
          </p>
        </section>
      )}

      {mine.length > 0 && (
        <section className="card card-pad stack-sm">
          <b>your payments</b>
          <ul className="plist">
            {mine.map((p) => (
              <li key={p.id}>
                <span>
                  <b>{inr(p.amount)}</b> <span className="muted small">· {dateTimeIN(p.createdAt)}</span>
                </span>
                <span className={`badge ${p.status === "verified" ? "tone-green" : p.status === "rejected" ? "tone-red" : "tone-amber"}`}>
                  {p.status === "verified" ? "Received" : p.status === "rejected" ? "Not found, message us" : "Checking"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="row">
        {wa && (
          <a href={wa} className="btn btn-wa" target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon /> questions? DM us
          </a>
        )}
        <Link href="/projects" className="btn">
          browse projects
        </Link>
      </div>
    </main>
  );
}
