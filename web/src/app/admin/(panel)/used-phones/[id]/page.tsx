import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pkr } from "@/lib/format";
import { requireStaffPage } from "@/lib/staff";
import { Badge, PageTitle, Panel, dt } from "@/components/admin/Primitives";
import { Attachments } from "@/components/admin/Attachments";

export const metadata = { title: "Used-phone purchase" };

export default async function UsedPurchasePage(props: PageProps<"/admin/used-phones/[id]">) {
  const me = await requireStaffPage();
  const { id } = await props.params;
  const { created } = await props.searchParams;
  const p = await db.usedPhonePurchase.findUnique({ where: { id }, include: { staff: true, variant: { include: { product: true } }, attachments: { orderBy: { createdAt: "asc" }, include: { uploadedBy: true } } } });
  if (!p) notFound();
  return (
    <>
      <PageTitle title={`Purchase ${p.ref}`} sub={`${p.brand} ${p.model} · bought ${dt(p.createdAt)} by ${p.staff.name}`}>
        <Link href="/admin/used-phones" className="text-sm text-blue">← Used-phone buying</Link>
      </PageTitle>
      {created && <p className="mb-6 rounded-xl bg-emerald-600/10 px-4 py-3 text-sm text-emerald-400">Purchase saved{p.variant ? ` and added to stock as ${p.variant.sku}` : ""}.</p>}
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <Panel title="Seller">
            <p className="font-semibold">{p.sellerName}</p>
            <p className="text-sm">{p.sellerPhone}{p.sellerAddress ? ` · ${p.sellerAddress}` : ""}</p>
            <p className="mt-1 font-mono text-sm">CNIC {p.sellerCnic}</p>
          </Panel>
          <Panel title="Phone">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted">IMEI / serial</dt><dd className="font-mono">{p.imei}</dd></div>
              <div><dt className="text-muted">Grade</dt><dd><Badge tone="gold">Grade {p.grade}</Badge></dd></div>
              <div><dt className="text-muted">Storage / colour</dt><dd>{[p.storage, p.color].filter(Boolean).join(" · ") || "—"}</dd></div>
              <div><dt className="text-muted">Battery</dt><dd>{p.batteryHealth != null ? `${p.batteryHealth}%` : "—"}</dd></div>
              <div><dt className="text-muted">Agreed price</dt><dd className="font-semibold">{pkr(p.agreedPrice)}</dd></div>
              <div><dt className="text-muted">In stock as</dt><dd>{p.variant ? <Link href={`/admin/products/${p.variant.productId}`} className="font-mono text-blue">{p.variant.sku} · {pkr(p.variant.price)}</Link> : "Not added to stock"}</dd></div>
            </dl>
            {p.notes && <p className="mt-3 whitespace-pre-line text-sm">{p.notes}</p>}
          </Panel>
        </div>
        <Panel title="ID & supporting documents">
          <Attachments items={p.attachments} target="used" id={p.id} isSuper={me.role === "SUPER_ADMIN"} />
        </Panel>
      </div>
    </>
  );
}
