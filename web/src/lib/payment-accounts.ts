/**
 * Manual payments (client request, 9 Oct 2026): the customer pays the shop directly by Easypaisa, JazzCash or
 * bank transfer to Faysal Bank, then uploads the receipt. Staff confirm or reject it in Admin → Inbox → Payments.
 * Account details and QR codes come from the shop owner; QR images live in /public/payments.
 */

export const MANUAL_METHODS = ["EASYPAISA", "JAZZCASH", "FAYSAL"] as const;
export type ManualMethod = (typeof MANUAL_METHODS)[number];

export type PaymentAccount = {
  label: string;
  short: string;
  accountTitle: string;
  /** Lines the customer can copy (number, IBAN…). */
  details: { label: string; value: string }[];
  /** QR code to scan, if the provider has one for this account. */
  qr: string | null;
  how: string;
};

export const PAYMENT_ACCOUNTS: Record<ManualMethod, PaymentAccount> = {
  EASYPAISA: {
    label: "Easypaisa",
    short: "Send to our Easypaisa account",
    accountTitle: "Tahir Abbas",
    details: [
      { label: "Easypaisa account number", value: "03346888696" },
      { label: "IBAN", value: "PK65TMFB0000000031300194" },
    ],
    qr: null,
    how: "Open Easypaisa → Send Money → Easypaisa account, paste the number and send the exact total.",
  },
  JAZZCASH: {
    label: "JazzCash",
    short: "Scan the QR or send to our JazzCash account",
    accountTitle: "Tahir Abbas",
    details: [
      { label: "JazzCash account number", value: "03346888696" },
      { label: "IBAN", value: "PK92JCMA0910923346888696" },
    ],
    qr: "/payments/jazzcash-qr.png",
    how: "Open JazzCash and scan the QR code, or send money to the account number, then pay the exact total.",
  },
  FAYSAL: {
    label: "Faysal Bank",
    short: "Bank transfer (IBFT) or scan the QR",
    accountTitle: "TAHIR ABBAS",
    details: [
      { label: "IBAN", value: "PK16FAYS3313701000004501" },
      { label: "Branch", value: "IBB Gulberg, Islamabad" },
    ],
    qr: "/payments/faysal-qr.png",
    how: "Transfer from any bank app to the IBAN (or scan the QR in your banking app) and send the exact total.",
  },
};

export const isManualMethod = (v: unknown): v is ManualMethod => typeof v === "string" && (MANUAL_METHODS as readonly string[]).includes(v);

/** Customer-facing words for an order's payment status. */
export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Awaiting payment",
  UNDER_REVIEW: "Payment under review",
  PAID: "Paid",
  FAILED: "Payment failed",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
};
