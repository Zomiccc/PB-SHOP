import { requireStaffPage } from "@/lib/staff";
import { isDemoMode } from "@/lib/demo";
import { db } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";
import { logoutAction } from "../_actions/auth";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaffPage();
  const [variants, newRepairs, inbox, onHold, reviews] = await Promise.all([
    db.variant.findMany({ where: { active: true, product: { active: true } }, select: { stockQty: true, lowStockThreshold: true } }),
    db.repairRequest.count({ where: { status: "NEW" } }),
    db.contactMessage.count({ where: { status: "NEW" } }),
    db.order.count({ where: { fulfilmentStatus: "ON_HOLD" } }),
    db.review.count({ where: { status: "PENDING" } }),
  ]);
  const lowStock = variants.filter((v) => v.stockQty <= v.lowStockThreshold).length;

  return (
    <div className="lg:flex">
      <AdminNav role={staff.role} name={staff.name} counts={{ lowStock, newRepairs, inbox, onHold, reviews }} logout={logoutAction} />
      <main className="min-w-0 flex-1 px-4 py-8 md:px-8 lg:px-10">
        {isDemoMode() && (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl bg-gold/15 px-4 py-3 text-sm ring-1 ring-gold/40">
            <b>Demo mode</b>
            <span className="text-muted">Anyone with the link can open this dashboard. Viewing as {staff.role === "SUPER_ADMIN" ? "Owner" : "Employee"}.</span>
            <a href={`/api/admin/demo-login?role=${staff.role === "SUPER_ADMIN" ? "employee" : "owner"}`} className="ml-auto rounded-lg bg-navy-950 px-3 py-1.5 text-xs font-semibold text-white">
              Switch to {staff.role === "SUPER_ADMIN" ? "Employee" : "Owner"} view
            </a>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
