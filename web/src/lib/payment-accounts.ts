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
  /**
   * The provider's official app for the "Open app" button (it never fills anything in): Android package, App Store id,
   * and — where the provider publishes one — the app's own link address (`scheme`), which is what lets Chrome open the
   * app itself. `iosLink` is the provider's official link that opens the app on iPhone (App Store if not installed).
   */
  app: { name: string; android: string; ios: string; scheme?: string; iosLink?: string };
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
    // easypaisa:// and the iPhone link are the ones Easypaisa's own website uses (easypaisa.com.pk/faqs).
    app: { name: "Easypaisa", android: "pk.com.telenor.phoenix", ios: "1227725092", scheme: "easypaisa", iosLink: "https://easypaisa.onelink.me/cw4d/d16aphk9" },
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
    app: { name: "JazzCash", android: "com.techlogix.mobilinkcustomer", ios: "1224617688" },
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
    app: { name: "Faysal DigiBank", android: "com.avanza.ambitwizfbl", ios: "1459836486" },
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

/**
 * Link that opens the provider's app on the customer's phone (client request). Android browsers only open an app
 * through the link address the app registers, so: with a `scheme` the app itself opens (Play Store if it isn't
 * installed); without one, its Play Store page (which shows "Open" when installed). iPhone: the provider's own app
 * link, else the App Store page. Elsewhere (computers): null, so no button is shown.
 */
export function appLink(app: PaymentAccount["app"], userAgent: string): string | null {
  const play = `https://play.google.com/store/apps/details?id=${app.android}`;
  if (/android/i.test(userAgent)) {
    return app.scheme ? `intent://#Intent;scheme=${app.scheme};package=${app.android};S.browser_fallback_url=${encodeURIComponent(play)};end` : play;
  }
  if (/iphone|ipad|ipod/i.test(userAgent)) return app.iosLink ?? `https://apps.apple.com/pk/app/id${app.ios}`;
  return null;
}
