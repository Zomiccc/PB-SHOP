"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { awardPointsAction } from "@/app/admin/_actions/operations";

/**
 * Manual PB Points award (Passport requirements §5): enter points + reason → review → confirm.
 * Nothing is added until staff press "Confirm award" on the review step.
 */
export function AwardPointsForm({ customer }: { customer: { id: string; name: string; passportNo: string; points: number } }) {
  const [state, action, pending] = useActionState(awardPointsAction, null);
  // The review step belongs to the action state it was opened in, so it closes by itself once the
  // server answers (success or error).
  const [pendingReview, setReview] = useState<{ points: number; reason: string; base: typeof state } | null>(null);
  const review = pendingReview && pendingReview.base === state ? pendingReview : null;
  const [error, setError] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        if (!review) {
          const points = Number(fd.get("points"));
          const reason = String(fd.get("reason") ?? "").trim();
          if (!Number.isInteger(points) || points < 1 || points > 10000) return setError("Enter between 1 and 10,000 points");
          if (reason.length < 3) return setError("A reason / note is required");
          setError(null);
          return setReview({ points, reason, base: state });
        }
        fd.set("confirmed", "yes");
        startTransition(() => action(fd));
      }}
      className="space-y-2"
    >
      <input type="hidden" name="customerId" value={customer.id} />
      <div className={review ? "hidden" : "grid gap-2 sm:grid-cols-[120px_1fr_auto]"}>
        <input name="points" type="number" min={1} max={10000} placeholder="Points" aria-label="Points to award" required className="field" />
        <input name="reason" placeholder="Reason / note (required)" aria-label="Reason" required maxLength={200} className="field" />
        <button className="btn btn-gold !py-2.5 !text-sm">Review award</button>
      </div>
      {review && (
        <div role="alertdialog" aria-label="Confirm award" className="rounded-xl bg-gold/10 p-4 ring-1 ring-gold/40">
          <p className="text-sm">
            Award <b className="text-gold">{review.points} PB Points</b> to <b>{customer.name}</b> <span className="font-mono text-xs text-muted">({customer.passportNo})</span>?
          </p>
          <p className="mt-1 text-xs text-muted">Reason: {review.reason} · New balance {customer.points + review.points}. Recorded under your name with the date and time.</p>
          <div className="mt-3 flex gap-2">
            <button disabled={pending} className="btn btn-gold !py-2 !text-sm disabled:opacity-50">{pending ? "Awarding…" : "Confirm award"}</button>
            <button type="button" disabled={pending} onClick={() => setReview(null)} className="btn btn-ghost !py-2 !text-sm text-ink"><span>Edit</span></button>
          </div>
        </div>
      )}
      {(error || state?.error) && <p role="alert" className="rounded-lg bg-red/10 px-3 py-2 text-sm text-red">{error ?? state?.error}</p>}
      {state?.ok && !review && <p role="status" className="rounded-lg bg-emerald-600/10 px-3 py-2 text-sm text-emerald-400">{state.message}</p>}
    </form>
  );
}
