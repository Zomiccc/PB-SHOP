import { db } from "@/lib/db";
import { Badge, FilterLink, PageTitle, Panel, dt, statusTone } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { chatReplyAction, contactStatusAction } from "../../_actions/operations";

export const metadata = { title: "Inbox" };

export default async function InboxPage(props: PageProps<"/admin/inbox">) {
  const sp = await props.searchParams;
  const tab = sp.tab === "chat" ? "chat" : "contact";
  const [messages, chats] = await Promise.all([
    db.contactMessage.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 100 }),
    db.chatConversation.findMany({ orderBy: { updatedAt: "desc" }, take: 40, include: { messages: { orderBy: { createdAt: "asc" } } } }),
  ]);
  return (
    <>
      <PageTitle title="Inbox" sub="Contact-form messages and website chat conversations." />
      <div className="mb-4 flex gap-2">
        <FilterLink href="/admin/inbox" active={tab === "contact"}>Contact form ({messages.filter((m) => m.status === "NEW").length} new)</FilterLink>
        <FilterLink href="/admin/inbox?tab=chat" active={tab === "chat"}>Website chat ({chats.length})</FilterLink>
      </div>

      {tab === "contact" ? (
        <div className="space-y-3">
          {messages.length === 0 && <Panel><p className="text-sm text-muted">No messages yet.</p></Panel>}
          {messages.map((m) => (
            <Panel key={m.id}>
              <div className="flex flex-wrap items-center gap-3">
                <b>{m.name}</b>
                <span className="text-sm text-muted">{[m.phone, m.email].filter(Boolean).join(" · ")}</span>
                <Badge tone={m.status === "NEW" ? "blue" : statusTone(m.status)}>{m.status}</Badge>
                <span className="ml-auto text-xs text-muted">{dt(m.createdAt)}</span>
              </div>
              {m.subject && <p className="mt-2 text-sm font-semibold">{m.subject}</p>}
              <p className="mt-1 whitespace-pre-line text-sm">{m.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {m.phone && <a href={`https://wa.me/${m.phone.replace(/\D/g, "").replace(/^0/, "92")}`} target="_blank" rel="noreferrer" className="btn btn-ghost !py-2 !text-sm text-ink"><span>Reply on WhatsApp</span></a>}
                {m.email && <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject ?? "your message to PB Mobiles"}`)}`} className="btn btn-ghost !py-2 !text-sm text-ink"><span>Email</span></a>}
                {["REPLIED", "CLOSED"].filter((s) => s !== m.status).map((s) => (
                  <ActionForm key={s} action={contactStatusAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="status" value={s} />
                    <Submit variant="ghost">Mark {s.toLowerCase()}</Submit>
                  </ActionForm>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {chats.length === 0 && <Panel><p className="text-sm text-muted">No chats yet.</p></Panel>}
          {chats.map((c) => (
            <Panel key={c.id} title={`Visitor ${c.visitorId.slice(0, 6)}`} action={<span className="text-xs text-muted">{dt(c.updatedAt)}</span>}>
              <ul className="max-h-72 space-y-2 overflow-y-auto text-sm" data-lenis-prevent>
                {c.messages.map((m) => (
                  <li key={m.id} className={m.from === "VISITOR" ? "text-right" : ""}>
                    <span className={`inline-block max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 ${m.from === "VISITOR" ? "bg-blue text-white" : m.from === "STAFF" ? "bg-gold/20" : "bg-cream"}`}>{m.body}</span>
                  </li>
                ))}
              </ul>
              <ActionForm action={chatReplyAction} resetOnSuccess className="mt-3 flex gap-2">
                <input type="hidden" name="conversationId" value={c.id} />
                <input name="body" placeholder="Reply as staff…" aria-label="Reply" className="field" />
                <Submit>Send</Submit>
              </ActionForm>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
