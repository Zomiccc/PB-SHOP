import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { availablePoints } from "@/lib/loyalty";
import { PageTitle } from "@/components/admin/Primitives";
import { PrintButton } from "@/components/admin/PrintButton";
import { PassportCardPrint } from "@/components/admin/PassportCardPrint";

export const metadata = { title: "Passport card" };

export default async function CustomerCardPage(props: PageProps<"/admin/customers/[id]/card">) {
  const { id } = await props.params;
  const c = await db.customer.findUnique({ where: { id } });
  if (!c) notFound();
  const points = await availablePoints(db, c.id);
  return (
    <>
      <PageTitle title={`Card — ${c.name}`} sub={`Passport ID ${c.passportNo} · ${points} points`}>
        <PrintButton label="Print card / save as PDF" />
        <Link href={`/admin/customers/${c.id}`} className="text-sm text-blue">Customer profile →</Link>
        <Link href="/admin/cards" className="text-sm text-blue">← Card generator</Link>
      </PageTitle>
      <PassportCardPrint name={c.name} number={c.passportNo} points={points} phone={c.phone} since={c.createdAt.toLocaleDateString("en-PK", { month: "short", year: "numeric" })} />
      <p className="mt-6 max-w-xl text-sm text-muted print:hidden">
        Prints at 85.6 × 54 mm (standard bank-card size): page 1 is the front, page 2 the back with the scannable Passport barcode. For a card printer choose CR80, no margins, and turn on “background graphics”.
      </p>
    </>
  );
}
