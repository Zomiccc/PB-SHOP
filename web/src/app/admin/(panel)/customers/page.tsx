import Link from "next/link";
import { db } from "@/lib/db";
import { like } from "@/lib/search";
import { PageTitle, Panel, Table, Td, dt } from "@/components/admin/Primitives";
import { requireStaffPage } from "@/lib/staff";

export const metadata = { title: "Customers" };

export default async function CustomersPage(props: PageProps<"/admin/customers">) {
  const me = await requireStaffPage();
  const isOwner = me.role === "SUPER_ADMIN";
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const digits = q.replace(/\D/g, "");
  const customers = await db.customer.findMany({
    where: q ? { OR: [{ name: like(q) }, { passportNo: { contains: q.toUpperCase() } }, { email: like(q) }, ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : [])] } : {},
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { _count: { select: { orders: true, repairs: true } }, referredBy: { select: { id: true, name: true } } },
  });
  return (
    <>
      <PageTitle title="Customers & loyalty" sub="PB Rewards profiles — purchases, repairs and points.">
        <form><input name="q" defaultValue={q} placeholder="Name, phone, passport no…" className="field !w-64 !rounded-full !py-2" /></form>
      </PageTitle>
      {sp.deleted && <p className="mb-4 rounded-xl bg-emerald-600/10 px-4 py-3 text-sm text-emerald-400">Customer deleted. Their orders and repairs are kept as business records.</p>}
      <Panel>
        <Table head={["Customer", "Rewards ID / referral code", "Points", "Orders", "Repairs", "Referred by", "Account", "Since", ""]} empty="No customers found.">
          {customers.map((c) => (
            <tr key={c.id} className="hover:bg-cream/60">
              <Td><Link href={`/admin/customers/${c.id}`} className="font-semibold hover:text-blue">{c.name}</Link><span className="block text-xs text-muted">{c.phone}</span></Td>
              <Td className="font-mono text-xs">{c.passportNo}</Td>
              <Td className="font-semibold">{c.loyaltyPoints}</Td>
              <Td>{c._count.orders}</Td>
              <Td>{c._count.repairs}</Td>
              <Td className="text-xs">{c.referredBy ? <Link href={`/admin/customers/${c.referredBy.id}`} className="text-blue hover:underline">{c.referredBy.name}</Link> : <span className="text-muted">—</span>}</Td>
              <Td className="text-xs">{c.passwordHash ? "Online account" : "Guest / walk-in"}</Td>
              <Td className="text-xs text-muted">{dt(c.createdAt)}</Td>
              <Td className="whitespace-nowrap text-xs">
                <Link href={`/admin/customers/${c.id}#award`} className="text-blue hover:underline">Award points</Link>
                {isOwner && <Link href={`/admin/customers/${c.id}#delete`} className="ml-3 font-semibold text-red hover:underline">Delete</Link>}
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}
