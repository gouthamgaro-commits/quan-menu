import { ArrowLeft, ExternalLink, Phone, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  cancelOrderAction,
  deleteOrderAction,
  deletePaymentAction,
  recordPaymentAction,
  updateOrderAction,
} from "@/app/admin/actions";
import ActionForm from "@/components/admin/ActionForm";
import ConfirmButton from "@/components/admin/ConfirmButton";
import PaymentButtons from "@/components/admin/PaymentButtons";
import { WhatsAppIcon } from "@/components/Icons";
import { Meter, StatusBadge } from "@/components/Ui";
import { requireAdmin } from "@/lib/admin";
import { STATUS_ORDER, STATUSES, branchName, categoryName } from "@/lib/catalog";
import { getOrder, getSettings, listPayments } from "@/lib/data";
import { dateIN, dateTimeIN, inr, phonePretty } from "@/lib/format";
import { waLink } from "@/lib/links";
import { money } from "@/lib/money";
import { daysUntil, todayIST } from "@/lib/pricing";
import { siteUrl } from "@/lib/site";

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  const o = Number.isInteger(id) && id > 0 ? await getOrder(id) : null;
  if (!o) notFound();
  const [s, payments, base] = await Promise.all([getSettings(), listPayments(o.id), siteUrl()]);
  const m = money(o);
  const link = `${base}/track/${o.token}`;
  const first = o.studentName.split(/\s+/)[0];
  const daysLeft = daysUntil(o.deadline, todayIST());
  const d = o.details;

  const templates = [
    o.price != null &&
      !m.advancePaid && {
        label: "Send price & payment link",
        text: `Hi ${first}, this is ${s.brandName}. Your project “${o.title}” is confirmed at ${inr(o.price)}. Please pay the ${inr(m.advance)} advance to start: ${link}`,
      },
    o.paid > 0 && {
      label: "Payment received",
      text: `Hi ${first}, we've received ${inr(o.paid)} for “${o.title}”. Thank you! We'll keep you posted here: ${link}`,
    },
    o.status === "ready" && {
      label: "Demo ready",
      text: `Hi ${first}, your project “${o.title}” is ready! When can we show you the demo?${m.balance > 0 ? ` The balance of ${inr(m.balance)} can be paid here: ${link}` : ""}`,
    },
    o.status === "delivered" && {
      label: "Files delivered",
      text: `Hi ${first}, your project files for “${o.title}” are ready to download on your order page: ${link}. All the best for your review!`,
    },
    { label: "Order link", text: `Hi ${first}, here's your order page for “${o.title}” (order ${o.code}): ${link}` },
  ].filter(Boolean) as { label: string; text: string }[];

  return (
    <>
      <div className="stack-sm">
        <Link href="/admin/orders" className="small row" style={{ gap: 6, textDecoration: "none" }}>
          <ArrowLeft size={15} aria-hidden /> All orders
        </Link>
        <div className="row between top">
          <div className="stack-xs grow">
            <span className="small muted">
              <span className="code-box">{o.code}</span> · {o.kind === "custom" ? "Own idea" : "From catalogue"} · {dateTimeIN(o.createdAt)}
            </span>
            <h1 style={{ fontSize: "clamp(22px, 4vw, 28px)" }}>{o.title}</h1>
          </div>
          <StatusBadge status={o.status} />
        </div>
      </div>

      <div className="admin-grid">
        <div className="stack">
          <section className="card card-pad stack-sm">
            <h2 className="card-title">Student</h2>
            <dl className="kv">
              <dt>Name</dt>
              <dd>
                <b>{o.studentName}</b>
              </dd>
              <dt>WhatsApp</dt>
              <dd className="row" style={{ gap: 8 }}>
                {phonePretty(o.phone)}
                <a className="btn btn-wa btn-sm" href={waLink(o.phone, `Hi ${first}, this is ${s.brandName} about your order ${o.code}.`)} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon size={15} /> Chat
                </a>
                <a className="btn btn-sm" href={`tel:+${o.phone}`}>
                  <Phone size={14} aria-hidden /> Call
                </a>
              </dd>
              {o.email && (
                <>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${o.email}`}>{o.email}</a>
                  </dd>
                </>
              )}
              {(o.college || o.branch || o.year) && (
                <>
                  <dt>College</dt>
                  <dd>{[o.college, o.branch && branchName(o.branch), o.year].filter(Boolean).join(" · ")}</dd>
                </>
              )}
              {d.teamSize && d.teamSize > 1 && (
                <>
                  <dt>Team</dt>
                  <dd>{d.teamSize} students</dd>
                </>
              )}
            </dl>
          </section>

          <section className="card card-pad stack-sm">
            <h2 className="card-title">What they asked for</h2>
            <dl className="kv">
              {o.kind === "catalog" ? (
                <>
                  <dt>Project</dt>
                  <dd>
                    {o.projectSlug ? (
                      <Link href={`/projects/${o.projectSlug}`} target="_blank">
                        {o.title} <ExternalLink size={13} aria-hidden />
                      </Link>
                    ) : (
                      o.title
                    )}
                    {d.basePrice != null && <span className="muted"> · {inr(d.basePrice)}</span>}
                  </dd>
                </>
              ) : (
                <>
                  <dt>Domain</dt>
                  <dd>{categoryName(d.category ?? "")}</dd>
                  <dt>Difficulty</dt>
                  <dd>
                    <Meter level={d.difficulty ?? 2} />
                  </dd>
                  {o.estimateLow != null && (
                    <>
                      <dt>Estimate shown</dt>
                      <dd>
                        {inr(o.estimateLow)} – {inr(o.estimateHigh)}
                        {d.rushPercent ? <span className="muted"> (incl. {d.rushPercent}% rush)</span> : null}
                      </dd>
                    </>
                  )}
                  {d.budget ? (
                    <>
                      <dt>Their budget</dt>
                      <dd>
                        <b>{inr(d.budget)}</b>
                      </dd>
                    </>
                  ) : null}
                  {d.reference && (
                    <>
                      <dt>Reference</dt>
                      <dd>
                        <a href={d.reference} target="_blank" rel="noopener noreferrer nofollow">
                          {d.reference}
                        </a>
                      </dd>
                    </>
                  )}
                </>
              )}
              {(d.addons?.length ?? 0) > 0 && (
                <>
                  <dt>Extras</dt>
                  <dd>{d.addons!.map((a) => `${a.name} (${inr(a.price)})`).join(", ")}</dd>
                </>
              )}
              {o.deadline && (
                <>
                  <dt>Needed by</dt>
                  <dd>
                    <b>{dateIN(o.deadline)}</b>
                    {daysLeft != null && (
                      <span className="muted"> · {daysLeft < 0 ? `${-daysLeft} days ago` : daysLeft === 0 ? "today" : `in ${daysLeft} days`}</span>
                    )}
                  </dd>
                </>
              )}
            </dl>
            {d.idea && (
              <div className="card card-pad small" style={{ background: "var(--surface-2)", boxShadow: "none", whiteSpace: "pre-line" }}>
                {d.idea}
              </div>
            )}
            {d.notes && (
              <p className="small" style={{ whiteSpace: "pre-line" }}>
                <b>Notes: </b>
                {d.notes}
              </p>
            )}
          </section>

          <section className="card card-pad stack-sm">
            <h2 className="card-title">Payments</h2>
            {o.price != null && (
              <div className="lines">
                <div className="line">
                  <span>Price</span>
                  <b>{inr(o.price)}</b>
                </div>
                <div className="line">
                  <span>Advance ({o.advancePercent}%)</span>
                  <span>
                    {inr(m.advance)} {m.advancePaid ? <span className="badge tone-green">paid</span> : null}
                  </span>
                </div>
                <div className="line">
                  <span>Received</span>
                  <span>{inr(o.paid)}</span>
                </div>
                <div className="line total">
                  <span>Balance</span>
                  <span>{inr(m.balance)}</span>
                </div>
              </div>
            )}
            {payments.length > 0 ? (
              <ul className="plist">
                {payments.map((p) => (
                  <li key={p.id}>
                    <span className="stack-xs">
                      <span>
                        <b>{inr(p.amount)}</b> · {p.method.toUpperCase()}
                        {p.utr && (
                          <>
                            {" "}
                            · <span className="mono">{p.utr}</span>
                          </>
                        )}
                      </span>
                      <span className="tiny muted">{dateTimeIN(p.createdAt)}</span>
                    </span>
                    <span className="row" style={{ gap: 6 }}>
                      {p.status === "submitted" ? (
                        <PaymentButtons paymentId={p.id} orderId={o.id} />
                      ) : (
                        <span className={`badge ${p.status === "verified" ? "tone-green" : "tone-red"}`}>
                          {p.status === "verified" ? "Received" : "Not received"}
                        </span>
                      )}
                      <form action={deletePaymentAction} className="inline-form">
                        <input type="hidden" name="payment" value={p.id} />
                        <input type="hidden" name="order" value={o.id} />
                        <ConfirmButton message="Delete this payment record?" className="btn btn-ghost btn-sm icon-btn">
                          <Trash2 size={15} aria-label="Delete payment" />
                        </ConfirmButton>
                      </form>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small muted">No payments yet.</p>
            )}
            <details>
              <summary className="small strong" style={{ cursor: "pointer" }}>
                Record a payment yourself (cash, bank transfer…)
              </summary>
              <ActionForm action={recordPaymentAction} submit="Record payment" className="stack-sm" buttonClass="btn btn-sm">
                <input type="hidden" name="id" value={o.id} />
                <div className="grid-3" style={{ marginTop: 10 }}>
                  <label className="field">
                    <span>Amount (₹)</span>
                    <input className="input" name="amount" inputMode="numeric" required defaultValue={m.dueNow || ""} />
                  </label>
                  <label className="field">
                    <span>Method</span>
                    <select className="select" name="method" defaultValue="upi">
                      <option value="upi">UPI</option>
                      <option value="cash">Cash</option>
                      <option value="bank">Bank transfer</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>
                      Reference <em>(optional)</em>
                    </span>
                    <input className="input mono" name="ref" maxLength={40} />
                  </label>
                </div>
              </ActionForm>
            </details>
          </section>
        </div>

        <aside className="stack">
          <section className="card card-pad stack-sm">
            <h2 className="card-title">Update order</h2>
            <ActionForm action={updateOrderAction} submit="Save changes" className="stack-sm">
              <input type="hidden" name="id" value={o.id} />
              <label className="field">
                <span>Status</span>
                <select className="select" name="status" defaultValue={o.status}>
                  {STATUS_ORDER.map((st) => (
                    <option key={st} value={st}>
                      {STATUSES[st].name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid-2">
                <label className="field">
                  <span>Price (₹)</span>
                  <input
                    className="input"
                    name="price"
                    inputMode="numeric"
                    defaultValue={o.price ?? ""}
                    placeholder={o.estimateLow != null ? `${o.estimateLow}–${o.estimateHigh}` : ""}
                  />
                </label>
                <label className="field">
                  <span>Advance %</span>
                  <input className="input" name="advance" inputMode="numeric" defaultValue={o.advancePercent} />
                </label>
              </div>
              {o.status === "requested" && <p className="hint">Enter the final price and save: the student's page then asks for the advance.</p>}
              <label className="field">
                <span>
                  Message on the student's page <em>(optional)</em>
                </span>
                <textarea className="textarea" name="note" defaultValue={o.noteForStudent} rows={3} placeholder="E.g. Demo video: https://… · We'll call you at 6 pm" />
              </label>
              <label className="field">
                <span>Download link for the files</span>
                <input className="input" name="delivery" type="url" defaultValue={o.deliveryLink} placeholder="Google Drive / Dropbox link" />
                <span className="hint">The student sees it once the status is Delivered.</span>
              </label>
              <label className="field">
                <span>
                  Private notes <em>(only you see these)</em>
                </span>
                <textarea className="textarea" name="adminNotes" defaultValue={o.adminNotes} rows={3} />
              </label>
            </ActionForm>
          </section>

          <section className="card card-pad stack-sm">
            <h2 className="card-title">
              <WhatsAppIcon /> Message the student
            </h2>
            <p className="small muted">Opens WhatsApp with the message typed out. Check it, then send.</p>
            <div className="wa-actions">
              {templates.map((t) => (
                <a key={t.label} className="btn btn-sm" href={waLink(o.phone, t.text)} target="_blank" rel="noopener noreferrer">
                  {t.label}
                </a>
              ))}
            </div>
            <Link href={`/track/${o.token}`} target="_blank" className="small">
              Open the student's order page <ExternalLink size={13} aria-hidden />
            </Link>
          </section>

          <section className="card card-pad row">
            <form action={cancelOrderAction}>
              <input type="hidden" name="id" value={o.id} />
              <button className="btn btn-sm" type="submit">
                {o.status === "cancelled" ? "Reopen order" : "Cancel order"}
              </button>
            </form>
            <form action={deleteOrderAction}>
              <input type="hidden" name="id" value={o.id} />
              <ConfirmButton message={`Delete order ${o.code} and its payments for good?`}>
                <Trash2 size={15} aria-hidden /> Delete
              </ConfirmButton>
            </form>
          </section>
        </aside>
      </div>
    </>
  );
}
