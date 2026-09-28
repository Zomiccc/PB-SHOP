import type { Broadcast } from "@prisma/client";
import { db } from "@/lib/db";
import { activeBroadcast, toPktInput } from "@/lib/broadcasts";
import { Badge, Field, PageTitle, Panel, dt } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { deleteBroadcastAction, saveBroadcastAction, toggleBroadcastAction } from "../../_actions/content";

export const metadata = { title: "Broadcasts" };


/** Broadcast messages for the homepage announcement bar (master brief §9). Every change is audited. */
export default async function BroadcastsPage() {
  const [list, live] = await Promise.all([db.broadcast.findMany({ orderBy: { createdAt: "desc" }, include: { createdBy: true } }), activeBroadcast()]);
  return (
    <>
      <PageTitle title="Broadcasts" sub="The published broadcast appears in the dark bar at the top of the homepage. Only one shows at a time — the most recently started." />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Panel title="New broadcast">
          <BroadcastForm />
        </Panel>
        <div className="space-y-4">
          {list.length === 0 && <Panel><p className="text-sm text-muted">No broadcasts yet.</p></Panel>}
          {list.map((b) => (
            <Panel key={b.id}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {live?.id === b.id ? <Badge tone="green">Showing now</Badge> : b.active ? <Badge tone="gold">Published · outside its dates</Badge> : <Badge>Draft / unpublished</Badge>}
                <span className="ml-auto text-xs text-muted">{dt(b.createdAt)}{b.createdBy ? ` · ${b.createdBy.name}` : ""}</span>
              </div>
              <details>
                <summary className="cursor-pointer text-sm font-semibold">{b.message}</summary>
                <div className="mt-4"><BroadcastForm b={b} /></div>
              </details>
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionForm action={toggleBroadcastAction}>
                  <input type="hidden" name="id" value={b.id} />
                  <Submit variant={b.active ? "ghost" : "gold"}>{b.active ? "Unpublish" : "Publish"}</Submit>
                </ActionForm>
                <ActionForm action={deleteBroadcastAction} confirm="Delete this broadcast?">
                  <input type="hidden" name="id" value={b.id} />
                  <Submit variant="ghost">Delete</Submit>
                </ActionForm>
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </>
  );
}

function BroadcastForm({ b }: { b?: Broadcast }) {
  return (
    <ActionForm action={saveBroadcastAction} resetOnSuccess={!b} className="space-y-3">
      <input type="hidden" name="id" value={b?.id ?? ""} />
      <Field label="Message" hint="Short and clear — up to 220 characters"><textarea name="message" rows={2} maxLength={220} defaultValue={b?.message} required className="field" placeholder="Eid timings: open 2 pm – 11 pm this week" /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Button text (optional)"><input name="ctaLabel" defaultValue={b?.ctaLabel ?? ""} placeholder="Shop the sale" className="field" /></Field>
        <Field label="Button link (optional)" hint="/used-phones or https://…"><input name="ctaHref" defaultValue={b?.ctaHref ?? ""} className="field" /></Field>
        <Field label="Show from (optional, PKT)"><input name="startsAt" type="datetime-local" defaultValue={toPktInput(b?.startsAt)} className="field" /></Field>
        <Field label="Show until (optional, PKT)"><input name="endsAt" type="datetime-local" defaultValue={toPktInput(b?.endsAt)} className="field" /></Field>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={b?.active ?? true} className="h-4 w-4" /> Published</label>
        <Submit variant="gold">{b ? "Save" : "Create broadcast"}</Submit>
      </div>
    </ActionForm>
  );
}
