import { redirect } from "next/navigation";
import { getStaff } from "@/lib/staff";
import { loginAction } from "../_actions/auth";
import { ActionForm, Submit } from "@/components/admin/ui";

export const metadata = { title: "Staff login" };

export default async function LoginPage() {
  if (await getStaff()) redirect("/admin");
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy-950 lg:block">
        <div aria-hidden className="absolute -left-20 top-1/3 h-96 w-96 rounded-full bg-blue/30 blur-3xl" />
        <div aria-hidden className="absolute -right-10 bottom-10 h-80 w-80 rounded-full bg-red/25 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <p className="display text-2xl italic"><span className="text-blue">P</span><span className="text-red">B</span> <span className="not-italic text-gold">STAFF</span></p>
          <div>
            <h1 className="display text-6xl">Sales, repairs &amp; stock.<br /><span className="text-gold">One desk.</span></h1>
            <p className="mt-4 max-w-md text-white/60">Every action is recorded against your individual account. Never share your login.</p>
          </div>
        </div>
      </div>
      <div className="grid place-items-center p-6">
        <ActionForm action={loginAction} className="w-full max-w-sm space-y-4">
          <h2 className="display text-3xl">Staff sign in</h2>
          <label className="block"><span className="label">Email</span><input name="email" type="email" autoComplete="username" required className="field" /></label>
          <label className="block"><span className="label">Password</span><input name="password" type="password" autoComplete="current-password" required className="field" /></label>
          <Submit variant="red" className="w-full">Sign in</Submit>
        </ActionForm>
      </div>
    </div>
  );
}
