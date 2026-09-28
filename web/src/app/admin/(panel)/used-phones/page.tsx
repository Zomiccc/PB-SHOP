import Link from "next/link";
import { db } from "@/lib/db";
import { pkr } from "@/lib/format";
import { maskCnic } from "@/lib/installments";
import { Badge, PageTitle, Panel, Table, Td, dt } from "@/components/admin/Primitives";

export const metadata = { title: "Used-phone buying" };

/** Phones bought from the public (master brief §6). Each record keeps the seller's CNIC front + back. */
export default async function UsedPurchasesPage(props: PageProps<"/admin/used-phones">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const list = await db.usedPhonePurchase.findMany({
    where: q ? { OR: [{ imei: { contains: q } }, { ref: { contains: q.toUpperCase() } }, { sellerPhone: { contains: q } }, { model: { contains: q } }] } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { staff: true, variant: true, _count: { select: { attachments: true } } },
  });
  return (
    <>
      <PageTitle title="Used-phone buying" sub="Every phone bought from a seller, with their ID documents, IMEI, grade and agreed price.">
        <form><input name="q" defaultValue={q} placeholder="IMEI, ref, phone…" className="field !w-56 !rounded-full !py-2" /></form>
        <Link href="/admin/used-phones/new" className="btn btn-gold !py-2.5 !text-sm">+ Buy a used phone</Link>
      </PageTitle>
      <Panel>
        <Table head={["Ref", "Phone", "IMEI", "Grade", "Paid", "Seller", "In stock as"]} empty="No purchases yet.">
          {list.map((p) => (
            <tr key={p.id}>
              <Td><Link href={`/admin/used-phones/${p.id}`} className="font-semibold hover:text-blue">{p.ref}</Link><span className="block text-xs text-muted">{dt(p.createdAt)} · {p.staff.name}</span></Td>
              <Td>{p.brand} {p.model}<span className="block text-xs text-muted">{[p.storage, p.color].filter(Boolean).join(" · ")}</span></Td>
              <Td className="font-mono text-xs">{p.imei}</Td>
              <Td><Badge tone="gold">Grade {p.grade}</Badge></Td>
              <Td className="font-semibold">{pkr(p.agreedPrice)}</Td>
              <Td>{p.sellerName}<span className="block font-mono text-xs text-muted">{maskCnic(p.sellerCnic)} · {p._count.attachments} docs</span></Td>
              <Td className="font-mono text-xs">{p.variant ? <Link href={`/admin/products/${p.variant.productId}`} className="text-blue">{p.variant.sku}</Link> : "—"}</Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}
