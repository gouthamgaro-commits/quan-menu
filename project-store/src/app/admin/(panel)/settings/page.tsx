import { saveSettingsAction } from "@/app/admin/actions";
import ActionForm from "@/components/admin/ActionForm";
import { Meter } from "@/components/Ui";
import { requireAdmin } from "@/lib/admin";
import { CATEGORIES, DIFFICULTIES } from "@/lib/catalog";
import { getSettings } from "@/lib/data";
import { inr } from "@/lib/format";
import { basePrice } from "@/lib/pricing";

export default async function SettingsPage() {
  await requireAdmin();
  const s = await getSettings();
  const addonRows = [...s.addons, { id: "", name: "", price: 0 }, { id: "", name: "", price: 0 }];
  const rushRows = [...s.rush, { days: 0, percent: 0 }].slice(0, 5);
  const local = s.whatsapp.startsWith("91") && s.whatsapp.length === 12 ? s.whatsapp.slice(2) : s.whatsapp;

  return (
    <>
      <div className="stack-xs">
        <h1 style={{ fontSize: 28 }}>Settings & prices</h1>
        <p className="muted">Changes show in the store as soon as you save.</p>
      </div>
      <ActionForm action={saveSettingsAction} submit="Save settings" className="stack-lg" buttonClass="btn btn-primary btn-lg">
        <section className="card card-pad stack">
          <h2 className="card-title">Your business</h2>
          <div className="grid-2">
            <label className="field">
              <span>Business name</span>
              <input className="input" name="brandName" required maxLength={60} defaultValue={s.brandName} />
            </label>
            <label className="field">
              <span>Tagline</span>
              <input className="input" name="tagline" maxLength={120} defaultValue={s.tagline} />
            </label>
            <label className="field">
              <span>WhatsApp number</span>
              <input className="input" name="whatsapp" type="tel" inputMode="tel" maxLength={18} defaultValue={local} placeholder="98765 43210" />
              <span className="hint">Students chat with you here. Every “WhatsApp” button uses it.</span>
            </label>
            <label className="field">
              <span>
                Email <em>(optional)</em>
              </span>
              <input className="input" name="email" type="email" maxLength={120} defaultValue={s.email} />
            </label>
            <label className="field">
              <span>
                City <em>(optional)</em>
              </span>
              <input className="input" name="city" maxLength={80} defaultValue={s.city} placeholder="Hyderabad" />
            </label>
            <label className="field">
              <span>
                Announcement bar <em>(optional)</em>
              </span>
              <input className="input" name="announcement" maxLength={200} defaultValue={s.announcement} placeholder="Final-year season: book before 15 Dec" />
            </label>
          </div>
        </section>

        <section className="card card-pad stack">
          <h2 className="card-title">Payments</h2>
          <div className="grid-3">
            <label className="field">
              <span>UPI ID</span>
              <input className="input mono" name="upiId" maxLength={80} defaultValue={s.upiId} placeholder="yourname@okaxis" autoCapitalize="off" />
            </label>
            <label className="field">
              <span>Name on the UPI account</span>
              <input className="input" name="upiName" maxLength={80} defaultValue={s.upiName} />
            </label>
            <label className="field">
              <span>Advance before starting (%)</span>
              <input className="input" name="advancePercent" inputMode="numeric" maxLength={3} defaultValue={s.advancePercent} />
            </label>
          </div>
          <p className="hint">
            Order pages show a UPI QR code for the exact amount due. A free business UPI ID (PhonePe Business, Paytm for Business,
            Google Pay for Business) works most smoothly with payment links.
          </p>
        </section>

        <section className="card card-pad stack">
          <div className="stack-xs">
            <h2 className="card-title">Pricing for students' own ideas</h2>
            <p className="small muted">
              Estimate = base price for the difficulty × the domain's multiplier, + rush charge + extras. Students see a range
              from 10% below to 20% above; you confirm the final price.
            </p>
          </div>
          <div className="grid-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            {DIFFICULTIES.map((d) => (
              <label key={d.level} className="field">
                <span>
                  <Meter level={d.level} />
                </span>
                <input className="input" name={`tier_${d.level}`} inputMode="numeric" defaultValue={s.tierPrices[d.level - 1]} aria-label={`${d.name} base price`} />
              </label>
            ))}
          </div>
          <b className="small">Domain multipliers</b>
          <div className="grid-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
            {CATEGORIES.map((c) => (
              <label key={c.id} className="field">
                <span style={{ fontWeight: 600 }}>
                  {c.name} <em>· Medium = {inr(basePrice(s, 2, c.id))}</em>
                </span>
                <input className="input" name={`factor_${c.id}`} inputMode="decimal" defaultValue={s.factors[c.id]} />
              </label>
            ))}
          </div>
          <b className="small">Rush charge for close deadlines</b>
          <div className="rows-editor">
            {rushRows.map((r, i) => (
              <div key={i} className="r three">
                <label className="field">
                  <span style={{ fontWeight: 600 }}>Deadline within (days)</span>
                  <input className="input" name={`rush_days_${i}`} inputMode="numeric" defaultValue={r.days || ""} />
                </label>
                <label className="field">
                  <span style={{ fontWeight: 600 }}>Extra (%)</span>
                  <input className="input" name={`rush_pct_${i}`} inputMode="numeric" defaultValue={r.percent || ""} />
                </label>
              </div>
            ))}
          </div>
          <span className="hint">The shortest matching deadline wins. Leave a row empty to remove it.</span>
        </section>

        <section className="card card-pad stack">
          <div className="stack-xs">
            <h2 className="card-title">Extras students can add</h2>
            <p className="small muted">Offered on every order and idea. Clear a name to remove that extra.</p>
          </div>
          <div className="rows-editor">
            {addonRows.map((a, i) => (
              // Keyed by id, so rows line up with the saved list after a save removes or adds one.
              <div key={a.id || `new-${i}`} className="r">
                <input type="hidden" name={`addon_id_${i}`} value={a.id} />
                <input className="input" name={`addon_name_${i}`} maxLength={120} defaultValue={a.name} placeholder="New extra, e.g. Hardware kit delivery" aria-label="Extra name" />
                <input className="input" name={`addon_price_${i}`} inputMode="numeric" defaultValue={a.name ? a.price : ""} placeholder="₹" aria-label="Extra price" />
              </div>
            ))}
          </div>
        </section>

        <section className="card card-pad stack">
          <div className="stack-xs">
            <h2 className="card-title">Payment, delivery & refund policy</h2>
            <p className="small muted">Shown on the Policies page. “## ” starts a heading, “- ” a bullet point.</p>
          </div>
          <textarea className="textarea mono" name="policies" rows={16} defaultValue={s.policies} style={{ fontSize: 13 }} />
        </section>
      </ActionForm>
    </>
  );
}
