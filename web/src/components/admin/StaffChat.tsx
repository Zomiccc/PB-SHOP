"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/format";
import { Icon } from "../ui/Icon";
import { ChatThread, type ThreadMessage } from "../chat/ChatThread";
import { useChatNotifications } from "../chat/useChatNotifications";

/**
 * Staff side of the website chat (master brief §13): message the customer with text, files and
 * voice notes; see delivery / read ticks; enable notifications for new customer messages.
 */
export function StaffChat({ conversationId, title }: { conversationId: string | null; title: string }) {
  const router = useRouter();
  const [msgs, setMsgs] = useState<ThreadMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const known = useRef<Map<string, string>>(new Map());
  const notify = useChatNotifications("STAFF");
  const showNote = notify.show;

  // Thread: poll every 4 s while this conversation is open.
  useEffect(() => {
    if (!conversationId) return;
    let alive = true;
    const load = async () => {
      const r = await fetch(`/api/admin/chat?id=${conversationId}&read=${document.visibilityState === "visible" ? 1 : 0}`).then((x) => (x.ok ? x.json() : null)).catch(() => null);
      if (alive && r?.messages) setMsgs(r.messages);
    };
    load();
    const t = setInterval(load, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [conversationId]);

  // All conversations: alert on new customer messages and refresh the list badges.
  useEffect(() => {
    let alive = true;
    const check = async () => {
      const r = await fetch("/api/admin/chat?summary=1").then((x) => (x.ok ? x.json() : null)).catch(() => null);
      if (!alive || !r?.latest) return;
      let changed = false;
      for (const l of r.latest as { conversationId: string; messageId: string; preview: string; unread: boolean }[]) {
        const prev = known.current.get(l.conversationId);
        if (prev && prev !== l.messageId) {
          changed = true;
          if (l.conversationId !== conversationId || document.visibilityState !== "visible") showNote("New website chat message", l.preview, `/admin/inbox?tab=chat&c=${l.conversationId}`);
        }
        known.current.set(l.conversationId, l.messageId);
      }
      if (changed) router.refresh();
    };
    check();
    const t = setInterval(check, 10000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [conversationId, router, showNote]);

  async function post(body: BodyInit, json: boolean, temp: ThreadMessage) {
    setError(null);
    setMsgs((m) => [...m, temp]);
    const res = await fetch("/api/admin/chat", { method: "POST", body, headers: json ? { "Content-Type": "application/json" } : undefined }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setMsgs((m) => m.map((x) => (x.id === temp.id ? { ...x, pending: false, failed: data?.error ?? "Not sent" } : x)));
      return;
    }
    setMsgs((m) => [...m.filter((x) => x.id !== temp.id), data.message]);
  }

  if (!conversationId) {
    return <div className="grid h-full min-h-[420px] place-items-center rounded-2xl bg-[#07090d] p-8 text-center text-sm text-white/50">Choose a conversation.</div>;
  }
  return (
    <div className="flex h-[min(680px,calc(100svh-12rem))] min-h-[420px] flex-col overflow-hidden rounded-2xl bg-[#07090d] text-white ring-1 ring-gold/25">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <p className="min-w-0 flex-1 truncate font-semibold">{title}</p>
        {notify.supported && (
          <button onClick={notify.toggle} disabled={notify.busy} aria-pressed={notify.enabled} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition", notify.enabled ? "bg-gold/20 text-gold" : "bg-white/10 text-white/80 hover:bg-white/15")}>
            <Icon name={notify.enabled ? "bell" : "bell-off"} className="h-3.5 w-3.5" /> {notify.enabled ? "Notifications on" : "Enable notifications"}
          </button>
        )}
      </div>
      {(notify.problem || error) && <p className="bg-red/10 px-4 py-2 text-xs text-red">{notify.problem ?? error}</p>}
      <ChatThread
        side="STAFF"
        messages={msgs}
        fileUrl={(id) => `/api/files/${id}`}
        placeholder="Reply to the customer…"
        onText={(text) => post(JSON.stringify({ conversationId, body: text }), true, { id: `tmp-${Date.now()}`, from: "STAFF", kind: "TEXT", body: text, createdAt: new Date().toISOString(), pending: true })}
        onFile={(file, voice) => {
          const fd = new FormData();
          fd.set("conversationId", conversationId);
          fd.set("file", file);
          if (voice) {
            fd.set("kind", "VOICE");
            fd.set("durationSec", String(voice.durationSec));
            fd.set("waveform", JSON.stringify(voice.waveform));
          }
          post(fd, false, { id: `tmp-${Date.now()}`, from: "STAFF", kind: "TEXT", body: voice ? "🎤 Sending voice note…" : `📎 Sending ${file.name}…`, createdAt: new Date().toISOString(), pending: true });
        }}
      />
    </div>
  );
}
