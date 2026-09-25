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
