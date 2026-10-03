import { requireStaffPage } from "@/lib/staff";
import { isDemoMode } from "@/lib/demo";
import { db } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";
import { logoutAction } from "../_actions/auth";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaffPage();
  const [variants, newRepairs, inbox, onHold, reviews, chatRows, pendingSales, newAppointments] = await Promise.all([
    db.variant.findMany({ where: { active: true, product: { active: true } }, select: { stockQty: true, lowStockThreshold: true } }),
    db.repairRequest.count({ where: { status: "NEW" } }),
    db.contactMessage.count({ where: { status: "NEW" } }),
    db.order.count({ where: { fulfilmentStatus: "ON_HOLD" } }),
    db.review.count({ where: { status: "PENDING" } }),
    // Conversations whose latest customer message staff haven't opened yet.
    db.chatConversation.findMany({ where: { messages: { some: { from: "VISITOR" } } }, select: { staffReadAt: true, messages: { where: { from: "VISITOR" }, orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } } }, take: 200, orderBy: { updatedAt: "desc" } }),
    db.installmentSale.count({ where: { status: "PENDING" } }),
    db.installmentRequest.count({ where: { status: "NEW" } }),
  ]);
  const installments = pendingSales + newAppointments;
  const chats = chatRows.filter((c) => c.messages[0] && (!c.staffReadAt || c.messages[0].createdAt > c.staffReadAt)).length;
  const lowStock = variants.filter((v) => v.stockQty <= v.lowStockThreshold).length;

  return (
    <div className="lg:flex">
      <AdminNav role={staff.role} name={staff.name} counts={{ lowStock, newRepairs, inbox, onHold, reviews, chats, installments }} logout={logoutAction} />
      <main className="min-w-0 flex-1 px-4 py-8 md:px-8 lg:px-10">
        {(await isDemoMode()) && (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl bg-gold/15 px-4 py-3 text-sm ring-1 ring-gold/40">
            <b>Demo mode</b>
            <span className="text-muted">Anyone with the link can open this dashboard. Viewing as {staff.role === "SUPER_ADMIN" ? "Owner" : "Employee"}.</span>
            {staff.role === "SUPER_ADMIN" && <a href="/admin/security" className="rounded-lg bg-red px-3 py-1.5 text-xs font-semibold text-white">Set up admin password</a>}
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
