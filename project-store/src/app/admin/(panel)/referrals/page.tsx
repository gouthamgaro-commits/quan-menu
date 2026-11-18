import Link from "next/link";
import { rewardPaidAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/admin";
import { getSettings, listRewards } from "@/lib/data";
import { dateTimeIN, inr } from "@/lib/format";

const LABEL = { applied: "Taken off their balance", owed: "You owe them", paid: "Paid" } as const;
const TONE = { applied: "tone-green", owed: "tone-amber", paid: "tone-green" } as const;

export default async function ReferralsAdmin() {
  await requireAdmin();
  const [s, owed, all] = await Promise.all([getSettings(), listRewards("owed"), listRewards(undefined, 200)]);
  const total = all.reduce((sum, r) => sum + r.amount, 0);

  return (
    <>
      <div className="stack-xs">
        <h1 style={{ fontSize: 28 }}>Referrals</h1>
        <p className="muted">
          {s.referralOn
            ? `Friend codes are on: ${inr(s.referralDiscount)} off for the friend, ${inr(s.referralReward)} back for the student who shared. `
            : "Friend codes are off. "}
          <Link href="/admin/settings">Change in Settings</Link>
        </p>
      </div>

      <section className="card card-pad stack-sm">
        <h2 className="card-title">Money you owe students</h2>
        <p className="small muted">
          These students had nothing left to pay when their friend&apos;s advance came in. Send them the reward (UPI is easiest), then mark it paid.
        </p>
        {owed.length === 0 ? (
          <p className="small muted">Nothing owed right now.</p>
        ) : (
          <ul className="plist">
            {owed.map((r) => (
              <li key={r.id}>
                <span className="stack-xs">
                  <span>
                    <b>{inr(r.amount)}</b> to <Link href={`/admin/orders/${r.referrerOrderId}`}>{r.referrerName}</Link> ({r.referrerCode})
                  </span>
                  <span className="tiny muted">
                    for bringing {r.friendName} ({r.referredCode}) · {dateTimeIN(r.createdAt)}
                  </span>
                </span>
                <form action={rewardPaidAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="btn btn-primary btn-sm" type="submit">
                    Mark paid
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card card-pad stack-sm">
        <h2 className="card-title">All rewards {all.length > 0 && <span className="muted small">· {inr(total)} in total</span>}</h2>
        {all.length === 0 ? (
          <p className="small muted">No rewards yet. They appear when a student who used a friend code pays their advance.</p>
        ) : (
          <ul className="plist">
            {all.map((r) => (
              <li key={r.id}>
                <span className="stack-xs">
                  <span>
                    <b>{inr(r.amount)}</b> · <Link href={`/admin/orders/${r.referrerOrderId}`}>{r.referrerName}</Link> brought{" "}
                    <Link href={`/admin/orders/${r.referredOrderId}`}>{r.friendName}</Link>
                  </span>
                  <span className="tiny muted">{dateTimeIN(r.createdAt)}</span>
                </span>
                <span className={`badge ${TONE[r.status]}`}>{LABEL[r.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
