import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { availablePoints } from "@/lib/loyalty";
import { PageTitle } from "@/components/admin/Primitives";
import { PrintButton } from "@/components/admin/PrintButton";
import { PassportCardPrint } from "@/components/admin/PassportCardPrint";
import { FlipPassportCard } from "@/components/home/FlipPassportCard";
import { getSetting } from "@/lib/settings";
import { formatCardExpiry } from "@/lib/passport-rules";

export const metadata = { title: "Rewards card" };

export default async function CustomerCardPage(props: PageProps<"/admin/customers/[id]/card">) {
  const { id } = await props.params;
  const c = await db.customer.findUnique({ where: { id } });
  if (!c) notFound();
  const points = await availablePoints(db, c.id);
  const since = c.createdAt.toLocaleDateString("en-PK", { month: "short", year: "numeric" });
  const card = await getSetting("passportCard");
  const expiry = c.cardExpiresAt ? formatCardExpiry(c.cardExpiresAt) : null;
  return (
    <>
      <PageTitle title={`Card — ${c.name}`} sub={`Rewards ID ${c.passportNo} · ${points} points`}>
        <PrintButton label="Print card / save as PDF" />
        <Link href={`/admin/customers/${c.id}`} className="text-sm text-blue">Customer profile →</Link>
        <Link href="/admin/cards" className="text-sm text-blue">← Card generator</Link>
      </PageTitle>
      <div className="max-w-md rounded-3xl bg-black p-8 print:hidden">
        <FlipPassportCard name={c.name} number={c.passportNo} points={points} phone={c.phone} since={since} expires={card.showExpiryOnDigital ? expiry : null} />
      </div>
      <p className="mt-3 max-w-md text-sm text-muted print:hidden">
        Card expiry: <b className="text-ink">{expiry ?? "not set"}</b> · {card.showExpiryOnDigital ? "shown on the digital card" : "hidden on the digital card"} · never printed. <Link href={`/admin/customers/${c.id}#passport`} className="text-blue">Change</Link>
      </p>
      <PassportCardPrint name={c.name} number={c.passportNo} points={points} phone={c.phone} since={since} />
      <p className="mt-6 max-w-xl text-sm text-muted print:hidden">
        Prints at 85.6 × 54 mm (standard bank-card size): page 1 is the front, page 2 the back with the scannable Rewards ID barcode. For a card printer choose CR80, no margins, and turn on “background graphics”.
      </p>
    </>
  );
}
