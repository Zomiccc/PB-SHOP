import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/staff";
import { Badge, Field, PageTitle, Panel, dt } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { resetStaffPasswordAction, saveStaffAction } from "../../_actions/owner";

export const metadata = { title: "Staff accounts" };

/** 6 employee accounts + 1 owner, each an individual login (§16). */
export default async function StaffPage() {
  const me = await requireStaffPage({ superAdmin: true });
  const staff = await db.staff.findMany({ orderBy: [{ role: "desc" }, { name: "asc" }] });
  const employees = staff.filter((s) => s.role === "ADMIN" && s.active).length;

  return (
    <>
      <PageTitle title="Staff accounts" sub={`${employees} active employee account(s) · the brief specifies 6 employees + 1 owner. Never share logins.`} />
      <div className="grid gap-4 xl:grid-cols-2">
        {staff.map((s) => (
          <Panel key={s.id}>
            <ActionForm action={saveStaffAction} className="space-y-3">
              <input type="hidden" name="id" value={s.id} />
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={s.role === "SUPER_ADMIN" ? "navy" : "blue"}>{s.role === "SUPER_ADMIN" ? "Owner / super admin" : "Employee"}</Badge>
                {!s.active && <Badge tone="red">Deactivated</Badge>}
                {s.mustChangePassword && <Badge tone="gold">Temp password</Badge>}
                <span className="ml-auto text-xs text-muted">Last login: {s.lastLoginAt ? dt(s.lastLoginAt) : "never"}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name"><input name="name" defaultValue={s.name} className="field" /></Field>
                <Field label="Email (login)"><input name="email" type="email" defaultValue={s.email} className="field" /></Field>
                <Field label="Role">
                  <select name="role" defaultValue={s.role} className="field">
                    <option value="ADMIN">Employee (normal admin)</option>
                    <option value="SUPER_ADMIN">Owner (super admin)</option>
                  </select>
                </Field>
                <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" name="active" defaultChecked={s.active} className="h-4 w-4" /> Active</label>
              </div>
              <Submit>Save</Submit>
            </ActionForm>
            {s.id !== me.id && (
              <ActionForm action={resetStaffPasswordAction} confirm={`Reset ${s.name}'s password?`} className="mt-3 border-t border-ink/10 pt-3">
                <input type="hidden" name="id" value={s.id} />
                <Submit variant="ghost">Reset password</Submit>
              </ActionForm>
            )}
          </Panel>
        ))}
        <Panel title="Add account">
          <ActionForm action={saveStaffAction} resetOnSuccess className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name"><input name="name" required className="field" /></Field>
              <Field label="Email"><input name="email" type="email" required className="field" /></Field>
              <Field label="Role">
                <select name="role" className="field"><option value="ADMIN">Employee</option><option value="SUPER_ADMIN">Owner</option></select>
              </Field>
              <input type="hidden" name="active" value="on" />
            </div>
            <Submit variant="red">Create account</Submit>
            <p className="text-xs text-muted">A temporary password is shown once; the person must change it at first login.</p>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
