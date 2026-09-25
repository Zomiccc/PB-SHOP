import crypto from "node:crypto";
import { authSecret } from "./secret";

/**
 * Pakistan payment gateway abstraction (§3).
 *
 * The site never sees or stores card / bank credentials: the customer is redirected (or form-posted)
 * to the gateway's hosted page, and the gateway calls back to /api/payments/callback where the
 * response is verified server-side before the order is confirmed.
 *
 * SANDBOX  — local simulator so the full success / pending / failed flow can be tested now.
 * JAZZCASH — hosted-checkout ("page redirection") integration. Field names and the hash recipe
 *            follow JazzCash's published merchant integration guide; confirm against the version
 *            issued with the merchant account before going live.
 * Other providers (Easypaisa, PayFast, Safepay) plug in by implementing PaymentProvider.
 */

export type PaymentStart =
  | { kind: "redirect"; url: string }
  | { kind: "form"; action: string; fields: Record<string, string> };

export type PaymentVerification = {
  orderNumber: string;
  status: "SUCCESS" | "PENDING" | "FAILED";
  /** false when the signature/hash check failed — such callbacks must not change any order state. */
  verified: boolean;
  providerRef: string | null;
  amount: number | null;
  raw: Record<string, string>;
  message?: string;
};

export type StartInput = {
  orderNumber: string;
  amount: number; // PKR
  method: string;
  customerPhone: string;
  customerEmail?: string | null;
  description: string;
  returnUrl: string;
};

interface PaymentProvider {
  name: string;
  start(input: StartInput): Promise<PaymentStart>;
  verify(params: Record<string, string>): Promise<PaymentVerification>;
}

const sandbox: PaymentProvider = {
  name: "SANDBOX",
  async start(input) {
    const q = new URLSearchParams({ order: input.orderNumber, amount: String(input.amount), method: input.method });
    return { kind: "redirect", url: `/checkout/sandbox-gateway?${q}` };
  },
  async verify(params) {
    const expected = signSandbox(params.order, params.status);
    if (params.sig !== expected) {
      return { orderNumber: params.order, status: "FAILED", verified: false, providerRef: null, amount: null, raw: params, message: "Signature mismatch" };
    }
    const status = params.status === "success" ? "SUCCESS" : params.status === "pending" ? "PENDING" : "FAILED";
    return { orderNumber: params.order, status, verified: true, providerRef: params.ref ?? null, amount: Number(params.amount) || null, raw: params };
  },
};

export function signSandbox(order: string, status: string) {
  return crypto.createHmac("sha256", authSecret()).update(`${order}|${status}`).digest("hex").slice(0, 32);
}

const jazzcash: PaymentProvider = {
  name: "JAZZCASH",
  async start(input) {
    const merchantId = required("JAZZCASH_MERCHANT_ID");
    const password = required("JAZZCASH_PASSWORD");
    const salt = required("JAZZCASH_INTEGRITY_SALT");
    const now = new Date();
    const expiry = new Date(now.getTime() + 60 * 60 * 1000);
    const txnRef = `T${stamp(now)}${Math.floor(Math.random() * 1000)}`;

    const fields: Record<string, string> = {
      pp_Version: "1.1",
      pp_TxnType: input.method === "MOBILE_WALLET" ? "MWALLET" : input.method === "DIRECT_DEBIT" ? "DD" : "MPAY",
      pp_Language: "EN",
      pp_MerchantID: merchantId,
      pp_Password: password,
      pp_TxnRefNo: txnRef,
      pp_Amount: String(input.amount * 100), // paisa
      pp_TxnCurrency: "PKR",
      pp_TxnDateTime: stamp(now),
      pp_TxnExpiryDateTime: stamp(expiry),
      pp_BillReference: input.orderNumber,
      pp_Description: input.description.slice(0, 100),
      pp_ReturnURL: input.returnUrl,
      ppmpf_1: input.orderNumber,
    };
    fields.pp_SecureHash = jazzHash(fields, salt);

    const host = process.env.JAZZCASH_ENV === "production" ? "https://payments.jazzcash.com.pk" : "https://sandbox.jazzcash.com.pk";
    return { kind: "form", action: `${host}/CustomerPortal/transactionmanagement/merchantform/`, fields };
  },
  async verify(params) {
    const salt = required("JAZZCASH_INTEGRITY_SALT");
    const { pp_SecureHash, ...rest } = params;
    const valid = !!pp_SecureHash && jazzHash(rest, salt) === pp_SecureHash.toUpperCase();
    const code = params.pp_ResponseCode;
    const status = !valid ? "FAILED" : code === "000" ? "SUCCESS" : code === "124" || code === "157" ? "PENDING" : "FAILED";
    return {
      orderNumber: params.ppmpf_1 || params.pp_BillReference,
      status,
      verified: valid,
      providerRef: params.pp_TxnRefNo ?? null,
      amount: params.pp_Amount ? Number(params.pp_Amount) / 100 : null,
      raw: params,
      message: valid ? params.pp_ResponseMessage : "Secure hash verification failed",
    };
  },
};

function jazzHash(fields: Record<string, string>, salt: string) {
  const values = Object.keys(fields)
    .filter((k) => (k.startsWith("pp_") || k.startsWith("ppmpf_")) && k !== "pp_SecureHash" && fields[k] !== "")
    .sort()
    .map((k) => fields[k]);
  return crypto.createHmac("sha256", salt).update([salt, ...values].join("&")).digest("hex").toUpperCase();
}

function stamp(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function required(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`Missing environment variable ${key}`);
  return v;
}

const providers: Record<string, PaymentProvider> = { SANDBOX: sandbox, JAZZCASH: jazzcash };

export function paymentProvider(): PaymentProvider {
  return providers[process.env.PAYMENT_PROVIDER ?? "SANDBOX"] ?? sandbox;
}
