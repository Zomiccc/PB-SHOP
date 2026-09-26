import { requireStaffPage } from "@/lib/staff";
import { changePasswordAction } from "../_actions/auth";
import { ActionForm, Submit } from "@/components/admin/ui";

export const metadata = { title: "Change password" };

export default async function PasswordPage() {
  const staff = await requireStaffPage({ allowPasswordChange: true });
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <ActionForm action={changePasswordAction} className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-8 shadow-[var(--shadow-lift)]">
        <h1 className="display text-3xl">{staff.mustChangePassword ? "Set your own password" : "Change password"}</h1>
        {staff.mustChangePassword && <p className="text-sm text-muted">For security, replace the temporary password before continuing.</p>}
        <label className="block"><span className="label">Current password</span><input name="current" type="password" autoComplete="current-password" required className="field" /></label>
        <label className="block"><span className="label">New password</span><input name="next" type="password" autoComplete="new-password" required minLength={10} className="field" /></label>
        <label className="block"><span className="label">Confirm new password</span><input name="confirm" type="password" autoComplete="new-password" required className="field" /></label>
        <Submit className="w-full">Save password</Submit>
      </ActionForm>
    </div>
  );
}
