import { db } from "@/lib/db";
import { activeBroadcasts, parseMedia, toPktInput } from "@/lib/broadcasts";
import { Badge, PageTitle, Panel, dt } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { BroadcastForm } from "@/components/admin/BroadcastForm";
import { deleteBroadcastAction, toggleBroadcastAction } from "../../_actions/content";

export const metadata = { title: "Broadcasts" };

/**
 * Broadcasts (master brief §9, v6 §1–§2): text with pictures and videos, shown centred beneath Shop Phones on the
 * homepage. Every live broadcast is shown (as a carousel when there are several). Every change is audited.
 */
export default async function BroadcastsPage() {
  const [list, live] = await Promise.all([db.broadcast.findMany({ orderBy: { createdAt: "desc" }, include: { createdBy: true } }), activeBroadcasts()]);
  const liveIds = new Set(live.map((b) => b.id));
  return (
    <>
      <PageTitle title="Broadcasts" sub="Published broadcasts appear centred beneath Shop Phones on the homepage — several at once become a carousel. Customers who enabled notifications are alerted when you publish." />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Panel title="New broadcast">
          {/* Remounts (clears) after each new broadcast is added. */}
          <BroadcastForm key={list.length} />
        </Panel>
        <div className="space-y-4">
          {list.length === 0 && <Panel><p className="text-sm text-muted">No broadcasts yet.</p></Panel>}
          {list.map((b) => {
            const media = parseMedia(b.media);
            return (
              <Panel key={b.id}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {liveIds.has(b.id) ? <Badge tone="green">Showing now</Badge> : b.active ? <Badge tone="gold">Published · outside its dates</Badge> : <Badge>Draft / unpublished</Badge>}
                  {media.length > 0 && <Badge tone="blue">{media.filter((m) => m.type === "IMAGE").length} photo · {media.filter((m) => m.type === "VIDEO").length} video</Badge>}
                  <span className="ml-auto text-xs text-muted">{dt(b.createdAt)}{b.createdBy ? ` · ${b.createdBy.name}` : ""}</span>
                </div>
                <details>
                  <summary className="cursor-pointer text-sm font-semibold">{b.message}</summary>
                  <div className="mt-4">
                    <BroadcastForm b={{ id: b.id, message: b.message, ctaLabel: b.ctaLabel, ctaHref: b.ctaHref, startsAt: toPktInput(b.startsAt), endsAt: toPktInput(b.endsAt), active: b.active, media }} />
                  </div>
                </details>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionForm action={toggleBroadcastAction}>
                    <input type="hidden" name="id" value={b.id} />
                    <Submit variant={b.active ? "ghost" : "gold"}>{b.active ? "Disable" : "Publish"}</Submit>
                  </ActionForm>
                  <ActionForm action={deleteBroadcastAction} confirm="Delete this broadcast?">
                    <input type="hidden" name="id" value={b.id} />
                    <Submit variant="ghost">Remove</Submit>
                  </ActionForm>
                </div>
              </Panel>
            );
          })}
        </div>
      </div>
    </>
  );
}
