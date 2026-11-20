import { requireStaffPage } from "@/lib/staff";
import { db } from "@/lib/db";
import { PageTitle } from "@/components/admin/Primitives";
import { Pos } from "@/components/admin/Pos";

export const metadata = { title: "POS" };

export default async function PosPage() {
  const staff = await requireStaffPage();
  const rewards = await db.reward.findMany({ where: { active: true, kind: "ITEM" }, orderBy: { pointsCost: "asc" }, select: { id: true, name: true, pointsCost: true } });
  return (
    <>
      <PageTitle title="Sell" sub={`Search by name or scan a barcode. Sales are recorded against ${staff.name}; stock decreases automatically.`} />
      <Pos isSuper={staff.role === "SUPER_ADMIN"} rewards={rewards} />
    </>
  );
}
