import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pkr } from "@/lib/format";
import { BRAND } from "@/lib/constants";
import { PrintButton } from "@/components/admin/PrintButton";

export const metadata = { title: "Receipt" };

/** 80mm thermal-printer friendly receipt. */
export default async function ReceiptPage(props: PageProps<"/admin/orders/[id]/receipt">) {
  const { id } = await props.params;
  const o = await db.order.findUnique({ where: { id }, include: { items: true, payments: { take: 1, orderBy: { createdAt: "desc" } }, staff: true, careCard: true, customer: true } });
  if (!o) notFound();
  return (
    <div className="fixed inset-0 z-[100] overflow-auto bg-white p-6 print:p-0">
      <div className="print-area mx-auto w-[300px] font-mono text-[12px] leading-snug text-black">
        <p className="text-center text-base font-bold">PB MOBILES</p>
        <p className="text-center">&amp; Repairing Lab</p>
        <p className="text-center">{BRAND.address}</p>
        <p className="text-center">{BRAND.phone}</p>
        <p className="my-2 border-t border-dashed border-black" />
        <p>Receipt: {o.number}</p>
        <p>{o.createdAt.toLocaleString("en-PK")}</p>
        {o.staff && <p>Served by: {o.staff.name}</p>}
        <p>Customer: {o.customerName}</p>
        <p className="my-2 border-t border-dashed border-black" />
        {o.items.map((i) => (
          <div key={i.id} className="mb-1">
            <p>{i.name}</p>
            <p className="flex justify-between"><span>{i.qty} x {pkr(i.unitPrice)}</span><span>{pkr(i.qty * i.unitPrice)}</span></p>
            <p className="text-[10px]">SKU {i.sku}</p>
          </div>
        ))}
        <p className="my-2 border-t border-dashed border-black" />
        {o.discount > 0 && <p className="flex justify-between"><span>Discount</span><span>-{pkr(o.discount)}</span></p>}
        <p className="flex justify-between text-sm font-bold"><span>TOTAL</span><span>{pkr(o.total)}</span></p>
        <p>Paid by: {o.payments[0]?.method ?? "-"} ({o.paymentStatus})</p>
        {o.careCard && <p className="mt-2">Care Card: {o.careCard.number} (5 free service visits)</p>}
        {o.customer && <p>Passport: {o.customer.passportNo}</p>}
        <p className="my-2 border-t border-dashed border-black" />
        <p className="text-center">Thank you for shopping with us!</p>
        <p className="text-center text-[10px]">Returns &amp; warranty: see pbmobiles.pk/returns</p>
        <div className="mt-4 text-center print:hidden"><PrintButton /></div>
      </div>
    </div>
  );
}
