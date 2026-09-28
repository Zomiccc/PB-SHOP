import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/staff";
import { previewOf } from "@/lib/chat";
import { Badge, FilterLink, PageTitle, Panel, dt, statusTone } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { Attachments } from "@/components/admin/Attachments";
import { StaffChat } from "@/components/admin/StaffChat";
import { contactStatusAction } from "../../_actions/operations";

export const metadata = { title: "Inbox & chat" };

export default async function InboxPage(props: PageProps<"/admin/inbox">) {
  const me = await requireStaffPage();
  const sp = await props.searchParams;
  const tab = sp.tab === "chat" ? "chat" : "contact";
  const [messages, chats] = await Promise.all([
    db.contactMessage.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 100, include: { attachments: { include: { uploadedBy: true } } } }),
    db.chatConversation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 60,
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 }, _count: { select: { messages: true } } },
    }),
  ]);
  const unreadIds = new Set(
    (
      await db.chatConversation.findMany({
        where: { id: { in: chats.map((c) => c.id) } },
        select: { id: true, staffReadAt: true, messages: { where: { from: "VISITOR" }, orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } } },
      })
    )
      .filter((c) => c.messages[0] && (!c.staffReadAt || c.messages[0].createdAt > c.staffReadAt))
      .map((c) => c.id),
  );
  const selected = typeof sp.c === "string" && chats.some((c) => c.id === sp.c) ? sp.c : chats[0]?.id ?? null;
  const label = (c: (typeof chats)[number]) => c.name || (c.phone ? c.phone : `Visitor ${c.visitorId.slice(0, 6)}`);

  return (
    <>
      <PageTitle title="Inbox & chat" sub="Contact-form messages and website chat. Reply with text, photos, documents or voice notes." />
      <div className="mb-4 flex gap-2">
        <FilterLink href="/admin/inbox" active={tab === "contact"}>Contact form ({messages.filter((m) => m.status === "NEW").length} new)</FilterLink>
        <FilterLink href="/admin/inbox?tab=chat" active={tab === "chat"}>Website chat ({unreadIds.size} unread)</FilterLink>
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
              {m.attachments.length > 0 && (
                <div className="mt-3">
                  <Attachments items={m.attachments} target="contact" id={m.id} canUpload={false} isSuper={me.role === "SUPER_ADMIN"} />
                </div>
              )}
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
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Panel className="!p-2">
            {chats.length === 0 ? (
              <p className="p-4 text-sm text-muted">No chats yet.</p>
            ) : (
              <ul className="max-h-[calc(100svh-14rem)] space-y-1 overflow-y-auto" data-lenis-prevent>
                {chats.map((c) => {
                  const last = c.messages[0];
                  return (
                    <li key={c.id}>
                      <Link href={`/admin/inbox?tab=chat&c=${c.id}`} className={`block rounded-xl px-3 py-2.5 text-sm transition ${selected === c.id ? "bg-gold/15 ring-1 ring-gold/40" : "hover:bg-ink/5"}`}>
                        <span className="flex items-center gap-2">
                          <b className="min-w-0 flex-1 truncate">{label(c)}</b>
                          {unreadIds.has(c.id) && <span className="h-2 w-2 shrink-0 rounded-full bg-red" aria-label="Unread" />}
                          <span className="shrink-0 text-[0.65rem] text-muted">{dt(c.updatedAt)}</span>
                        </span>
                        <span className="block truncate text-xs text-muted">{last ? `${last.from === "STAFF" ? "You: " : last.from === "BOT" ? "Bot: " : ""}${previewOf(last.kind, last.body)}` : "—"}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
          <StaffChat conversationId={selected} title={selected ? label(chats.find((c) => c.id === selected)!) : ""} />
        </div>
      )}
    </>
  );
}
