import Link from "next/link";
import { db } from "@/lib/db";
import { like } from "@/lib/search";
import { PageTitle, Panel, Table, Td, dt } from "@/components/admin/Primitives";

export const metadata = { title: "Customers" };

export default async function CustomersPage(props: PageProps<"/admin/customers">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const digits = q.replace(/\D/g, "");
  const customers = await db.customer.findMany({
    where: q ? { OR: [{ name: like(q) }, { passportNo: { contains: q.toUpperCase() } }, { email: like(q) }, ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : [])] } : {},
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { _count: { select: { orders: true, repairs: true, careCards: true } } },
  });
  return (
    <>
      <PageTitle title="Customers & loyalty" sub="PB Phone Passport profiles — purchases, repairs, points and Care Cards.">
        <form><input name="q" defaultValue={q} placeholder="Name, phone, passport no…" className="field !w-64 !rounded-full !py-2" /></form>
      </PageTitle>
      <Panel>
        <Table head={["Customer", "Passport", "Points", "Orders", "Repairs", "Care Cards", "Account", "Since"]} empty="No customers found.">
          {customers.map((c) => (
            <tr key={c.id} className="hover:bg-cream/60">
              <Td><Link href={`/admin/customers/${c.id}`} className="font-semibold hover:text-blue">{c.name}</Link><span className="block text-xs text-muted">{c.phone}</span></Td>
              <Td className="font-mono text-xs">{c.passportNo}</Td>
              <Td className="font-semibold">{c.loyaltyPoints}</Td>
              <Td>{c._count.orders}</Td>
              <Td>{c._count.repairs}</Td>
              <Td>{c._count.careCards}</Td>
              <Td className="text-xs">{c.passwordHash ? "Online account" : "Guest / walk-in"}</Td>
              <Td className="text-xs text-muted">{dt(c.createdAt)}</Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}
