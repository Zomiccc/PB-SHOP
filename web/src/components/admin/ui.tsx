"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import { cn } from "@/lib/format";
import type { FormState } from "@/app/admin/_actions/auth";

const Pending = createContext(false);

/**
 * Form bound to a server action; shows the returned error / success message inline.
 * Submits manually (not via the `action` prop) so React doesn't clear what staff typed
 * when the server returns a validation error. Use `resetOnSuccess` for "add new" forms.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirm,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <Pending.Provider value={pending}>
      <form
        ref={ref}
        className={className}
        onSubmit={(e) => {
          e.preventDefault();
          if (confirm && !window.confirm(confirm)) return;
          const fd = new FormData(e.currentTarget);
          startTransition(() => formAction(fd));
        }}
      >
        {children}
        {state?.error && (
          <p role="alert" className="mt-3 rounded-lg bg-red/10 px-3 py-2 text-sm text-red">
            {state.error}
          </p>
        )}
        {state?.ok && state.message && (
          <p role="status" className="mt-3 rounded-lg bg-emerald-600/10 px-3 py-2 text-sm text-emerald-700">
            {state.message}
          </p>
        )}
      </form>
    </Pending.Provider>
  );
}

export function Submit({ children, variant = "primary", className }: { children: React.ReactNode; variant?: "primary" | "red" | "gold" | "ghost"; className?: string }) {
  const pending = useContext(Pending);
  const v = { primary: "btn-primary", red: "btn-red", gold: "btn-gold", ghost: "btn-ghost text-navy-950" }[variant];
  return (
    <button disabled={pending} className={cn("btn !py-2.5 !text-sm disabled:opacity-50", v, className)}>
      {pending ? "Working…" : children}
    </button>
  );
}
