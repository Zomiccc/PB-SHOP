import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/staff";
import { getSetting } from "@/lib/settings";
import { Badge, Field, PageTitle, Panel } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { saveCareServiceAction, saveRewardAction, saveSettingAction } from "../../_actions/owner";

export const metadata = { title: "Settings & rules" };

/** Owner-only configuration: Care Card services (§18), loyalty rules (§7), social proof (§15), delivery. */
export default async function SettingsPage() {
  await requireStaffPage({ superAdmin: true });
  const [financing, social, loyalty, shipping, care, services, rewards] = await Promise.all([
    getSetting("financing"),
    getSetting("socialProof"),
    getSetting("loyalty"),
    getSetting("shipping"),
    getSetting("careCard"),
    db.careCardService.findMany({ orderBy: { visitNumber: "asc" } }),
    db.reward.findMany({ orderBy: { pointsCost: "asc" } }),
  ]);

  return (
    <>
      <PageTitle title="Settings & rules" sub="Only the owner can change these. Every change is recorded in the audit log." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="PB Care Card services (§18)" className="xl:col-span-2">
          <p className="mb-4 text-sm text-muted">The brief defines visits 1–4; visit 5 is reserved until you define it. Employees can redeem available services but cannot change these.</p>
          <div className="grid gap-3 lg:grid-cols-2">
            {services.map((s) => (
              <ActionForm key={s.id} action={saveCareServiceAction} className={`grid gap-2 rounded-xl p-3 sm:grid-cols-[80px_1fr] ${s.configured ? "bg-cream" : "border-2 border-dashed border-gold/60"}`}>
                <input type="hidden" name="id" value={s.id} />
                <Field label="Visit"><input name="visitNumber" type="number" min={1} max={10} defaultValue={s.visitNumber} className="field" /></Field>
                <Field label={s.configured ? "Free service" : "Free service — not yet defined"}><input name="name" defaultValue={s.configured ? s.name : ""} placeholder="e.g. Free camera lens clean" className="field" /></Field>
                <Field label="Description (optional)" className="sm:col-span-2"><input name="description" defaultValue={s.description ?? ""} className="field" /></Field>
                <div className="flex items-center justify-between sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={s.active} className="h-4 w-4" /> Active</label>
                  <Submit>Save visit {s.visitNumber}</Submit>
                </div>
              </ActionForm>
            ))}
          </div>
          <ActionForm action={saveSettingAction} className="mt-5 flex flex-wrap items-end gap-4 border-t border-ink/10 pt-5">
            <input type="hidden" name="key" value="careCard" />
            <Field label="Max uses per card"><input name="maxUses" type="number" min={1} max={10} defaultValue={care.maxUses} className="field !w-28" /></Field>
            <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="allowRepeatService" defaultChecked={care.allowRepeatService} className="h-4 w-4" /> Allow the same service twice on one card</label>
            <Submit>Save card rules</Submit>
          </ActionForm>
        </Panel>

        <Panel title="Installment calculator" className="xl:col-span-2">
          <p className="mb-4 text-sm text-muted">
            Shown on <a href="/installments" target="_blank" className="text-blue underline">/installments</a> and on every phone page. Enter the financing partner&apos;s real rates from the agent app — the defaults are samples.
          </p>
          <ActionForm action={saveSettingAction} className="space-y-4">
            <input type="hidden" name="key" value="financing" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Financing partner name"><input name="partnerName" defaultValue={financing.partnerName} className="field" /></Field>
              <Field label="Min. down payment %"><input name="minDownPaymentPercent" type="number" step="0.01" min={0} max={100} defaultValue={financing.minDownPaymentPercent} className="field" /></Field>
              <Field label="Plans (number of terms)" hint="Comma-separated, e.g. 3,6,9,12"><input name="termOptions" defaultValue={financing.termOptions} className="field" /></Field>
              <Field label="Repayment period">
                <select name="period" defaultValue={financing.period} className="field">
                  <option value="MONTHLY">Monthly</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </Field>
              <Field label="Markup % per month" hint="Flat, on the financed amount"><input name="markupPercentPerMonth" type="number" step="0.01" min={0} defaultValue={financing.markupPercentPerMonth} className="field" /></Field>
              <Field label="Service fee %" hint="One-time, on financed amount"><input name="serviceFeePercent" type="number" step="0.01" min={0} defaultValue={financing.serviceFeePercent} className="field" /></Field>
              <Field label="Risk management fee %" hint="One-time, on financed amount"><input name="riskFeePercent" type="number" step="0.01" min={0} defaultValue={financing.riskFeePercent} className="field" /></Field>
              <Field label="Guarantee deposit (Rs)" hint="Fixed, paid upfront"><input name="guaranteeDeposit" type="number" min={0} defaultValue={financing.guaranteeDeposit} className="field" /></Field>
              <Field label="Lowest eligible price (Rs)"><input name="minPrice" type="number" min={0} defaultValue={financing.minPrice} className="field" /></Field>
            </div>
            <Field label="Disclaimer shown under the calculator"><textarea name="disclaimer" rows={2} defaultValue={financing.disclaimer} className="field" /></Field>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={financing.enabled} className="h-4 w-4" /> Show installments on the website</label>
              <Submit>Save calculator</Submit>
            </div>
          </ActionForm>
        </Panel>

        <Panel title="Loyalty rules (§7)">
          <ActionForm action={saveSettingAction} className="space-y-3">
            <input type="hidden" name="key" value="loyalty" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Rupees per 1 point"><input name="pointsPerRupees" type="number" min={1} defaultValue={loyalty.pointsPerRupees} className="field" /></Field>
              <Field label="Points per completed repair"><input name="repairPoints" type="number" min={0} defaultValue={loyalty.repairPoints} className="field" /></Field>
              <Field label="Value of 1 point (PKR)"><input name="pointValueRupees" type="number" min={0} defaultValue={loyalty.pointValueRupees} className="field" /></Field>
              <Field label="Points expire after (months)"><input name="expiryMonths" type="number" min={1} defaultValue={loyalty.expiryMonths} className="field" /></Field>
            </div>
            <Field label="Exclusions (shown to customers)"><textarea name="exclusions" rows={2} defaultValue={loyalty.exclusions} className="field" /></Field>
            <Submit>Save loyalty rules</Submit>
          </ActionForm>
        </Panel>

        <Panel title="Rewards catalogue">
          <div className="space-y-3">
            {rewards.map((r) => (
              <ActionForm key={r.id} action={saveRewardAction} className="grid gap-2 rounded-xl bg-cream p-3 sm:grid-cols-[1fr_100px_auto_auto] sm:items-end">
                <input type="hidden" name="id" value={r.id} />
                <Field label="Reward"><input name="name" defaultValue={r.name} className="field" /></Field>
                <Field label="Points"><input name="pointsCost" type="number" defaultValue={r.pointsCost} className="field" /></Field>
                <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="active" defaultChecked={r.active} className="h-4 w-4" /> Active</label>
                <Submit variant="ghost">Save</Submit>
              </ActionForm>
            ))}
            <ActionForm action={saveRewardAction} resetOnSuccess className="grid gap-2 rounded-xl border-2 border-dashed border-ink/15 p-3 sm:grid-cols-[1fr_100px_auto] sm:items-end">
              <Field label="New reward"><input name="name" className="field" /></Field>
              <Field label="Points"><input name="pointsCost" type="number" className="field" /></Field>
              <input type="hidden" name="active" value="on" />
              <Submit>Add</Submit>
            </ActionForm>
          </div>
        </Panel>

        <Panel title="Purchase pop-ups (§15)">
          <ActionForm action={saveSettingAction} className="space-y-3">
            <input type="hidden" name="key" value="socialProof" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={social.enabled} className="h-4 w-4" /> Show “Ali K. purchased …” pop-ups {social.enabled ? <Badge tone="green">On</Badge> : <Badge>Off</Badge>}</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Seconds between pop-ups"><input name="intervalSeconds" type="number" min={5} defaultValue={social.intervalSeconds} className="field" /></Field>
              <Field label="Seconds each stays visible"><input name="displaySeconds" type="number" min={2} defaultValue={social.displaySeconds} className="field" /></Field>
              <Field label="Use orders from last (days)"><input name="lookbackDays" type="number" min={1} defaultValue={social.lookbackDays} className="field" /></Field>
              <Field label="Max different pop-ups"><input name="maxItems" type="number" min={1} defaultValue={social.maxItems} className="field" /></Field>
            </div>
            <p className="text-xs text-muted">Only genuine paid orders are shown, with first name + initial and city. Nothing is ever invented.</p>
            <Submit>Save</Submit>
          </ActionForm>
        </Panel>

        <Panel title="Delivery">
          <ActionForm action={saveSettingAction} className="space-y-3">
            <input type="hidden" name="key" value="shipping" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Flat delivery fee (PKR)"><input name="flatFee" type="number" min={0} defaultValue={shipping.flatFee} className="field" /></Field>
              <Field label="Free delivery over (PKR)"><input name="freeOver" type="number" min={0} defaultValue={shipping.freeOver} className="field" /></Field>
            </div>
            <Submit>Save</Submit>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
