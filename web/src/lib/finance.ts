/**
 * Phone installment (financing) calculator — same structure as the financing partner's agent-app
 * calculator: price → down payment → financed amount → fees → repayment per term.
 * All rates are configured by the owner in Admin → Settings (Setting "financing"); the partner's
 * real rates must be entered there. Pure functions: used on the server and in the browser.
 */

export type FinancingConfig = {
  enabled: boolean;
  partnerName: string;
  /** Minimum down payment as % of price. */
  minDownPaymentPercent: number;
  /** Comma-separated number of repayment terms offered, e.g. "3,6,9,12". */
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

export function minDownPayment(price: number, cfg: FinancingConfig) {
  return Math.ceil((price * cfg.minDownPaymentPercent) / 100);
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
  const perInstallment = terms > 0 ? Math.ceil(totalRepayable / terms) : totalRepayable;
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
