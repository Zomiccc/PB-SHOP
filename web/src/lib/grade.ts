/**
 * STRICT PRODUCT GRADING RULE (master brief §8).
 *  - A device/SKU has exactly ONE grade at a time; "A/B", "A, B" etc. are rejected.
 *  - Used devices must have a grade; new devices must not.
 *  - The same model in different grades = separate SKUs (variants), each with its own single grade.
 * Every write path (admin, seed, imports) calls assertVariantGrade, so the rule holds at the backend
 * regardless of what any UI sends. The grade is snapshotted onto each order line for receipts.
 */

export const GRADES = ["A+", "A", "B", "C"] as const;
export type Grade = (typeof GRADES)[number];

export class GradeError extends Error {}

/** Returns the single canonical grade, or null for none. Throws on multiple/unknown grades. */
export function normalizeGrade(input: string | null | undefined): Grade | null {
  const raw = (input ?? "").trim().toUpperCase().replace(/^GRADE\s*/, "");
  if (!raw) return null;
  if (/[\/,&|;]|\bAND\b|\s+/.test(raw)) throw new GradeError("A device can only have one grade — create a separate SKU for each grade");
  const g = GRADES.find((x) => x === raw);
  if (!g) throw new GradeError(`Unknown grade "${input}". Use one of: ${GRADES.join(", ")}`);
  return g;
}

export function assertVariantGrade(condition: string, grade: string | null | undefined): Grade | null {
  const g = normalizeGrade(grade);
  if (condition === "USED" && !g) throw new GradeError("Used devices need a grade (A+, A, B or C)");
  if (condition !== "USED" && g) throw new GradeError("New products don't have a grade");
  return g;
}
