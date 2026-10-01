/**
 * Phone installment (financing) calculator — matches the financing partner's (Palm) agent-app
 * "Product Price Center": price → down payment option → financed amount → flat monthly markup →
 * monthly payment, all rounded to the rupee. Verified against the app: Rs 73,999, 30% down
 * (Rs 22,200), 9 terms at 6% per month → Rs 8,863 per month.
 * Rates are configured by the owner in Admin → Settings (Setting "installmentCalc").
 * Pure functions: used on the server and in the browser.
 */

export type FinancingConfig = {
  enabled: boolean;
  partnerName: string;
  /** Minimum down payment as % of price. */
  minDownPaymentPercent: number;
  /** Comma-separated down-payment choices in %, e.g. "10,20,30,40,50" (as in the partner app). */
  downPaymentOptions: string;
  /** Comma-separated number of repayment terms offered, e.g. "3,6,9". */
  termOptions: string;
  /** "MONTHLY" or "WEEKLY" repayments. */
  period: string;
  /** Flat markup per month on the financed amount, %. */
  markupPercentPerMonth: number;
  /** One-time platform service fee, % of financed amount (added to the financed balance). */
  serviceFeePercent: number;
  /** One-time risk management fee, % of financed amount (added to the financed balance). */
  riskFeePercent: number;
  /** Fixed guarantee deposit paid upfront, Rs. */
  guaranteeDeposit: number;
  /** Lowest phone price eligible for financing, Rs. */
  minPrice: number;
  disclaimer: string;
};

export type FinancingQuote = {
  price: number;
  downPayment: number;
  financed: number;
  markup: number;
  serviceFee: number;
  riskFee: number;
  guaranteeDeposit: number;
  terms: number;
  period: "MONTHLY" | "WEEKLY";
  perInstallment: number;
  dueToday: number;
  totalRepayable: number;
  totalCost: number;
  extraCost: number;
};

export function termList(cfg: Pick<FinancingConfig, "termOptions">) {
  const list = cfg.termOptions
    .split(/[,\s]+/)
    .map((t) => Math.round(Number(t)))
    .filter((n) => Number.isFinite(n) && n > 0 && n <= 104);
  return [...new Set(list)].sort((a, b) => a - b);
}

/** Down-payment choices (%), never below the minimum. */
export function downPaymentList(cfg: Pick<FinancingConfig, "downPaymentOptions" | "minDownPaymentPercent">) {
  const list = (cfg.downPaymentOptions ?? "")
    .split(/[,\s]+/)
    .map((t) => Number(t))
    .filter((n) => Number.isFinite(n) && n >= cfg.minDownPaymentPercent && n < 100);
  const out = [...new Set(list)].sort((a, b) => a - b);
  return out.length ? out : [cfg.minDownPaymentPercent];
}

/** Rounded to the rupee, like the partner app (30% of Rs 73,999 = Rs 22,200). */
export function minDownPayment(price: number, cfg: FinancingConfig) {
  return Math.round((price * cfg.minDownPaymentPercent) / 100);
}

/** Months covered by a plan — weekly plans are converted so the monthly markup applies fairly. */
const monthsFor = (terms: number, period: string) => (period === "WEEKLY" ? terms / (52 / 12) : terms);

export function quote(price: number, downPaymentIn: number, terms: number, cfg: FinancingConfig): FinancingQuote {
  const p = Math.max(0, Math.round(price));
  const downPayment = Math.min(p, Math.max(minDownPayment(p, cfg), Math.round(downPaymentIn)));
  const financed = p - downPayment;
  const months = monthsFor(terms, cfg.period);
  const markup = Math.round((financed * cfg.markupPercentPerMonth * months) / 100);
  const serviceFee = Math.round((financed * cfg.serviceFeePercent) / 100);
  const riskFee = Math.round((financed * cfg.riskFeePercent) / 100);
  const totalRepayable = financed + markup + serviceFee + riskFee;
  const perInstallment = terms > 0 ? Math.round(totalRepayable / terms) : totalRepayable;
  const dueToday = downPayment + cfg.guaranteeDeposit;
  const totalCost = downPayment + perInstallment * terms;
  return {
    price: p,
    downPayment,
    financed,
    markup,
    serviceFee,
    riskFee,
    guaranteeDeposit: cfg.guaranteeDeposit,
    terms,
    period: cfg.period === "WEEKLY" ? "WEEKLY" : "MONTHLY",
    perInstallment,
    dueToday,
    totalRepayable,
    totalCost,
    extraCost: totalCost - p,
  };
}

/** Lowest installment for a price (minimum down payment, longest plan) — for "from Rs X/month" badges. */
export function lowestInstallment(price: number, cfg: FinancingConfig) {
  const terms = termList(cfg);
  if (!cfg.enabled || !terms.length || price < cfg.minPrice) return null;
  return quote(price, minDownPayment(price, cfg), terms[terms.length - 1], cfg);
}
