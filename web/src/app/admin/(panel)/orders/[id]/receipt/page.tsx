import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pkr } from "@/lib/format";
import { BRAND } from "@/lib/constants";
import { PrintButton } from "@/components/admin/PrintButton";

export const metadata = { title: "Receipt" };

/** 80mm thermal-printer friendly receipt. */
export default async function ReceiptPage(props: PageProps<"/admin/orders/[id]/receipt">) {
  const { id } = await props.params;
  const o = await db.order.findUnique({ where: { id }, include: { items: true, payments: { take: 1, orderBy: { createdAt: "desc" } }, staff: true, customer: true, loyaltyTx: { include: { reward: true } } } });
  if (!o) notFound();
  // PB Points on the bill (Nov 2026): earned on this bill, used on this bill, and the balance after it.
  const earned = o.loyaltyTx.filter((t) => t.type === "EARN" || t.type === "AWARD").reduce((s, t) => s + t.points, 0);
  const used = o.loyaltyTx.filter((t) => t.type === "REDEEM");
  const usedPts = -used.reduce((s, t) => s + t.points, 0);
  const balance = o.pointsBalance ?? o.customer?.loyaltyPoints ?? null;
  return (
    <div className="fixed inset-0 z-[100] overflow-auto bg-white p-6 print:p-0">
      <div className="print-area mx-auto w-[300px] font-mono text-[12px] leading-snug text-black">
        <p className="text-center text-base font-bold">PB MOBILES</p>
        <p className="text-center">&amp; Repairing Lab</p>
        <p className="text-center">{BRAND.address}</p>
        <p className="text-center">{BRAND.phone}</p>
        <p className="my-2 border-t border-dashed border-black" />
        <p>Receipt: {o.number}</p>
        <p>{o.createdAt.toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}</p>
        {o.staff && <p>Served by: {o.staff.name}</p>}
        <p>Customer: {o.customerName}</p>
        <p className="my-2 border-t border-dashed border-black" />
        {o.items.map((i) => (
          <div key={i.id} className="mb-1">
            <p>{i.name}</p>
            <p className="flex justify-between"><span>{i.qty} x {pkr(i.unitPrice)}</span><span>{pkr(i.qty * i.unitPrice)}</span></p>
            <p className="text-[10px]">SKU {i.sku}{i.grade ? ` · Grade ${i.grade}` : ""}</p>
          </div>
        ))}
        <p className="my-2 border-t border-dashed border-black" />
        {o.discount > 0 && <p className="flex justify-between"><span>Discount</span><span>-{pkr(o.discount)}</span></p>}
        <p className="flex justify-between text-sm font-bold"><span>TOTAL</span><span>{pkr(o.total)}</span></p>
        <p>Paid by: {o.payments[0]?.method ?? "-"} ({o.paymentStatus})</p>
        {o.customer && (
          <>
            <p className="my-2 border-t border-dashed border-black" />
            <p className="text-center font-bold">PB REWARDS</p>
            <p>Rewards ID: {o.customer.passportNo}</p>
            <p className="flex justify-between"><span>Points earned</span><span>+{earned}</span></p>
            {usedPts > 0 && (
              <>
                <p className="flex justify-between"><span>Points used</span><span>-{usedPts}</span></p>
                {used.map((t) => t.reward && <p key={t.id} className="text-[10px]">Reward: {t.reward.name}</p>)}
              </>
            )}
            {balance != null && <p className="flex justify-between font-bold"><span>Points balance</span><span>{balance}</span></p>}
            <p className="text-[10px]">Check points & rewards at pbmobiles.com/account</p>
          </>
        )}
        <p className="my-2 border-t border-dashed border-black" />
        <p className="text-center">Thank you for shopping with us!</p>
        <p className="text-center text-[10px]">Returns &amp; warranty: see pbmobiles.com/returns</p>
        <div className="mt-4 text-center print:hidden"><PrintButton /></div>
      </div>
    </div>
  );
}
