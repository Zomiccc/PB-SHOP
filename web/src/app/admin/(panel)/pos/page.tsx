import { requireStaffPage } from "@/lib/staff";
import { PageTitle } from "@/components/admin/Primitives";
import { Pos } from "@/components/admin/Pos";

export const metadata = { title: "POS" };

export default async function PosPage() {
  const staff = await requireStaffPage();
  return (
    <>
      <PageTitle title="Scan & sell" sub={`Sales are recorded against ${staff.name}. Stock decreases automatically when the sale completes.`} />
      <Pos isSuper={staff.role === "SUPER_ADMIN"} />
    </>
  );
}
