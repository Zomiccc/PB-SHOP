import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/staff";
import { isDemoMode } from "@/lib/demo";
import { Field, PageTitle, Panel } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { setupAdminPasswordAction } from "../../_actions/auth";

export const metadata = { title: "Admin security" };
export const dynamic = "force-dynamic";

/** Owner only: set the admin sign-in email + password. Ends demo mode (no-password entry) for good. */
export default async function SecurityPage() {
  const me = await requireStaffPage({ superAdmin: true });
  const demo = await isDemoMode();
  const employees = await db.staff.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } });

  return (
    <>
      <PageTitle title="Admin security" sub="Your sign-in for this admin panel." />
      {demo ? (
        <div className="mb-6 max-w-2xl rounded-2xl bg-red/10 p-5 text-sm ring-1 ring-red/40">
          <p className="font-semibold text-red">The admin panel has no password right now.</p>
          <p className="mt-1 text-muted">It is in demo mode, so anyone who opens /admin gets in. Set your email and password below — demo mode switches off as soon as you save, and the admin will always ask for a password after that.</p>
        </div>
      ) : (
        <div className="mb-6 max-w-2xl rounded-2xl bg-emerald-600/10 p-5 text-sm ring-1 ring-emerald-600/30">
          <p className="font-semibold text-emerald-400">Password protected.</p>
          <p className="mt-1 text-muted">The admin panel needs an email and password. You can change yours here at any time.</p>
        </div>
      )}
      <Panel title={demo ? "Set up admin password" : "Change sign-in email or password"} className="max-w-2xl">
        <ActionForm action={setupAdminPasswordAction} className="space-y-4">
          <Field label="Sign-in email">
            <input name="email" type="email" autoComplete="username" required defaultValue={me.email} className="field" />
          </Field>
          {!demo && (
            <Field label="Current password">
              <input name="current" type="password" autoComplete="current-password" required className="field" />
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New password" hint="At least 10 characters, with letters and a number">
              <input name="next" type="password" autoComplete="new-password" required minLength={10} className="field" />
            </Field>
            <Field label="Confirm new password">
              <input name="confirm" type="password" autoComplete="new-password" required minLength={10} className="field" />
            </Field>
          </div>
          <Submit variant="red">{demo ? "Save password & turn off demo mode" : "Save"}</Submit>
        </ActionForm>
      </Panel>
      <p className="mt-6 max-w-2xl text-sm text-muted">
        Employees: {employees.length} active account(s). Once demo mode is off, each employee needs their own password — give them one from{" "}
        <Link href="/admin/staff" className="text-blue">Staff accounts</Link> (Reset password shows a temporary one they change at first sign-in).
      </p>
    </>
  );
}
