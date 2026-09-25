import { requireStaffPage } from "@/lib/staff";
import { db } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";
import { logoutAction } from "../_actions/auth";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaffPage();
  const [variants, newRepairs, inbox, onHold] = await Promise.all([
    db.variant.findMany({ where: { active: true, product: { active: true } }, select: { stockQty: true, lowStockThreshold: true } }),
    db.repairRequest.count({ where: { status: "NEW" } }),
    db.contactMessage.count({ where: { status: "NEW" } }),
    db.order.count({ where: { fulfilmentStatus: "ON_HOLD" } }),
  ]);
  const lowStock = variants.filter((v) => v.stockQty <= v.lowStockThreshold).length;

  return (
    <div className="lg:flex">
      <AdminNav role={staff.role} name={staff.name} counts={{ lowStock, newRepairs, inbox, onHold }} logout={logoutAction} />
      <main className="min-w-0 flex-1 px-4 py-8 md:px-8 lg:px-10">{children}</main>
    </div>
  );
}
