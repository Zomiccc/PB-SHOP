export function pkr(amount: number) {
  return "Rs " + new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(amount);
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Privacy-safe social-proof label: "Ahmed K." — never full names or contact details (§15). */
export function privacyLabel(name: string, city?: string | null) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? "A customer";
  const initial = parts[1]?.[0] ? ` ${parts[1][0].toUpperCase()}.` : "";
  return `${first}${initial}${city ? ` from ${city}` : ""}`;
}

export function timeAgo(date: Date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

export const humanSize = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

/**
 * One canonical form for Pakistani mobile numbers: "03001234567". "+92 300 1234567", "923001234567",
 * "0300-1234567" and "3001234567" are all the same phone, so one number can only ever hold one
 * customer account / Passport. Anything else is returned with only spaces and dashes removed.
 */
export function normalizePhone(raw: string | null | undefined) {
  const s = (raw ?? "").trim();
  const d = s.replace(/\D/g, "");
  if (/^923\d{9}$/.test(d)) return `0${d.slice(2)}`;
  if (/^03\d{9}$/.test(d)) return d;
  if (/^3\d{9}$/.test(d)) return `0${d}`;
  return s.replace(/[\s-]/g, "");
}

/** A Pakistani mobile number in any common format ("0300…", "+92 300…", "92300…"). */
export const isPkMobile = (raw: string | null | undefined) => /^03\d{9}$/.test(normalizePhone(raw));
