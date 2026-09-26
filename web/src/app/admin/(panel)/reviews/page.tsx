import Link from "next/link";
import { db } from "@/lib/db";
import { Badge, FilterLink, PageTitle, Panel, dt, statusTone } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { Stars } from "@/components/reviews/Reviews";
import { moderateReviewAction } from "../../_actions/reviews";

export const metadata = { title: "Reviews" };

const TABS = { PENDING: "Awaiting approval", APPROVED: "Published", REJECTED: "Rejected" } as const;

export default async function ReviewsAdminPage(props: PageProps<"/admin/reviews">) {
  const sp = await props.searchParams;
  const tab = (typeof sp.tab === "string" && sp.tab in TABS ? sp.tab : "PENDING") as keyof typeof TABS;
  const [reviews, counts] = await Promise.all([
    db.review.findMany({ where: { status: tab }, orderBy: { createdAt: "desc" }, take: 200, include: { product: { select: { name: true, slug: true } } } }),
    db.review.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <PageTitle title="Reviews" sub="Customer reviews appear on the website only after approval. Nothing is published automatically." />
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(TABS) as (keyof typeof TABS)[]).map((k) => (
          <FilterLink key={k} href={`/admin/reviews?tab=${k}`} active={tab === k}>{TABS[k]} ({count(k)})</FilterLink>
        ))}
      </div>
      <div className="space-y-3">
        {reviews.length === 0 && <Panel><p className="text-sm text-muted">No reviews here.</p></Panel>}
        {reviews.map((r) => (
          <Panel key={r.id}>
            <div className="flex flex-wrap items-center gap-3">
              <Stars value={r.rating} />
              <b>{r.customerName}</b>
              {r.phone && <span className="text-xs text-muted">{r.phone}</span>}
              {r.verified ? <Badge tone="green">Verified customer</Badge> : <Badge>Unverified</Badge>}
              <Badge tone={statusTone(r.status === "APPROVED" ? "APPROVED" : r.status === "REJECTED" ? "FAILED" : "PENDING")}>{r.status}</Badge>
              <span className="ml-auto text-xs text-muted">{dt(r.createdAt)}</span>
            </div>
            <p className="mt-2 text-xs text-muted">
              {r.product ? <>On <Link href={`/product/${r.product.slug}`} target="_blank" className="text-blue">{r.product.name}</Link></> : "Shop / service review"}
            </p>
            {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
            <p className="mt-1 whitespace-pre-line text-sm">{r.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {r.status !== "APPROVED" && (
                <ActionForm action={moderateReviewAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="decision" value="APPROVED" /><Submit variant="gold">Approve &amp; publish</Submit></ActionForm>
              )}
              {r.status !== "REJECTED" && (
                <ActionForm action={moderateReviewAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="decision" value="REJECTED" /><Submit variant="ghost">Reject</Submit></ActionForm>
              )}
              <ActionForm action={moderateReviewAction} confirm="Delete this review permanently?"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="decision" value="DELETE" /><Submit variant="red">Delete</Submit></ActionForm>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
