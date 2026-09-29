import type { Reward } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/staff";
import { getSetting } from "@/lib/settings";
import { Badge, Field, PageTitle, Panel } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { saveRewardAction, saveSettingAction } from "../../_actions/owner";

export const metadata = { title: "Settings & rules" };

/** Owner-only configuration: Phone Passport points & rewards, installment calculator, social proof, delivery. */
export default async function SettingsPage() {
  await requireStaffPage({ superAdmin: true });
  const [financing, social, passport, shipping, rewards] = await Promise.all([
    getSetting("installmentCalc"),
    getSetting("socialProof"),
    getSetting("passport"),
    getSetting("shipping"),
    db.reward.findMany({ orderBy: [{ sortOrder: "asc" }, { pointsCost: "asc" }] }),
  ]);

  return (
    <>
      <PageTitle title="Settings & rules" sub="Only the owner can change these. Every change is recorded in the audit log." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Installment calculator" className="xl:col-span-2">
          <p className="mb-4 text-sm text-muted">
            Shown on <a href="/installments" target="_blank" className="text-blue underline">/installments</a> and on every phone page. Defaults match the partner app&apos;s standard plan (6% per month flat, no extra fees, 10% minimum down payment).
          </p>
          <ActionForm action={saveSettingAction} className="space-y-4">
            <input type="hidden" name="key" value="installmentCalc" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Financing partner name"><input name="partnerName" defaultValue={financing.partnerName} className="field" /></Field>
              <Field label="Min. down payment %"><input name="minDownPaymentPercent" type="number" step="0.01" min={0} max={100} defaultValue={financing.minDownPaymentPercent} className="field" /></Field>
              <Field label="Down-payment choices %" hint="Comma-separated, e.g. 10,20,30,40,50"><input name="downPaymentOptions" defaultValue={financing.downPaymentOptions} className="field" /></Field>
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

        <Panel title="PB Phone Passport — earning & expiry">
          <ActionForm action={saveSettingAction} className="space-y-3">
            <input type="hidden" name="key" value="passport" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Points per completed repair"><input name="repairPoints" type="number" min={0} defaultValue={passport.repairPoints} className="field" /></Field>
              <Field label="Points per new phone bought"><input name="newPhonePoints" type="number" min={0} defaultValue={passport.newPhonePoints} className="field" /></Field>
              <Field label="Points per used phone bought"><input name="usedPhonePoints" type="number" min={0} defaultValue={passport.usedPhonePoints} className="field" /></Field>
              <Field label="Points expire after (months)" hint="Counted separately for each earning event"><input name="expiryMonths" type="number" min={1} defaultValue={passport.expiryMonths} className="field" /></Field>
            </div>
            <Field label="Exclusions (shown to customers)"><textarea name="exclusions" rows={3} defaultValue={passport.exclusions} className="field" /></Field>
            <p className="text-xs text-muted">Changes apply to points earned from now on; points already earned keep their original expiry date.</p>
            <Submit>Save Passport rules</Submit>
          </ActionForm>
        </Panel>

        <Panel title="Phone Passport rewards">
          <div className="space-y-3">
            {rewards.map((r) => <RewardForm key={r.id} r={r} />)}
            <details className="rounded-xl border-2 border-dashed border-ink/15">
              <summary className="cursor-pointer p-3 text-sm font-semibold text-blue">+ New reward</summary>
              <div className="border-t border-ink/10 p-3"><RewardForm /></div>
            </details>
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

function RewardForm({ r }: { r?: Reward }) {
  return (
    <ActionForm action={saveRewardAction} resetOnSuccess={!r} className={`grid gap-2 rounded-xl p-3 sm:grid-cols-2 ${r ? (r.active ? "bg-cream" : "bg-cream opacity-70") : ""}`}>
      <input type="hidden" name="id" value={r?.id ?? ""} />
      <Field label="Reward"><input name="name" defaultValue={r?.name} placeholder="e.g. AirPods" className="field" /></Field>
      <Field label="Points required"><input name="pointsCost" type="number" min={1} defaultValue={r?.pointsCost} className="field" /></Field>
      <Field label="Type">
        <select name="kind" defaultValue={r?.kind ?? "ITEM"} className="field">
          <option value="ITEM">Item (accessory / product)</option>
          <option value="REPAIR_DISCOUNT">Repair discount (% off labour)</option>
        </select>
      </Field>
      <Field label="Discount % (repair discounts only)"><input name="discountPercent" type="number" min={1} max={100} defaultValue={r?.discountPercent ?? ""} className="field" /></Field>
      <Field label="Description" className="sm:col-span-2"><input name="description" defaultValue={r?.description ?? ""} className="field" /></Field>
      <Field label="Exclusions"><input name="exclusions" defaultValue={r?.exclusions ?? ""} placeholder="e.g. Excludes parts" className="field" /></Field>
      <Field label="Display order"><input name="sortOrder" type="number" defaultValue={r?.sortOrder ?? 0} className="field" /></Field>
      <input type="hidden" name="appliesTo" value={r?.appliesTo ?? "ACCESSORY"} />
      <div className="flex items-center justify-between sm:col-span-2">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={r?.active ?? true} className="h-4 w-4" /> Enabled</label>
        <Submit variant={r ? "ghost" : "primary"}>{r ? "Save reward" : "Add reward"}</Submit>
      </div>
    </ActionForm>
  );
}
