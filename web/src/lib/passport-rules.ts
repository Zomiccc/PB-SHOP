/**
 * Pure Phone Passport helpers (no database) — used by server code and by browser forms.
 * Birthday is month + day only; the year is never required (Passport requirements §2).
 */

export class PassportError extends Error {}

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // 29 Feb allowed (no year)

/** Validates a birthday from form input. Both empty → null; one without the other → error. */
export function parseBirthday(monthIn: unknown, dayIn: unknown, { required = false } = {}) {
  const m = String(monthIn ?? "").trim();
  const d = String(dayIn ?? "").trim();
  if (!m && !d) {
    if (required) throw new PassportError("Choose your birth month and day");
    return null;
  }
  const month = Number(m);
  const day = Number(d);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new PassportError("Choose a birth month");
  if (!Number.isInteger(day) || day < 1 || day > DAYS_IN_MONTH[month - 1]) throw new PassportError(`Enter a day between 1 and ${DAYS_IN_MONTH[month - 1]}`);
  return { birthMonth: month, birthDay: day };
}

/** "14 March" — or null when no birthday is on file. */
export function formatBirthday(c: { birthMonth: number | null; birthDay: number | null }) {
  return c.birthMonth && c.birthDay ? `${c.birthDay} ${MONTHS[c.birthMonth - 1]}` : null;
}

/** Card expiry as shown to people: "09/2028". */
export const formatCardExpiry = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
