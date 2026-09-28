"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BRAND } from "@/lib/constants";
import { cn } from "@/lib/format";
import { Icon } from "../ui/Icon";
import { ChatThread, type ThreadMessage } from "./ChatThread";
import { useChatNotifications } from "./useChatNotifications";

const QUICK = ["Book a repair", "Check phone availability", "Track my repair", "Opening hours", "Installments"];
const WELCOME: ThreadMessage = { id: "welcome", from: "BOT", kind: "TEXT", body: "Hi! 👋 Welcome to PB Mobiles & Repairing Lab. Ask about a phone, a repair or an order — send a photo or a voice note, or pick an option below.", createdAt: new Date(0).toISOString() };

const readId = () => {
  try {
    return localStorage.getItem("pb-chat-id");
  } catch {
    return null;
  }
};

/**
 * Site-wide chat (master brief §13) in the PB dark theme: text, attachments and voice notes both ways,
 * delivery / read ticks, and optional phone / browser notifications when the shop replies.
 */
export function Chatbox() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ThreadMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [unread, setUnread] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const notify = useChatNotifications("VISITOR", conversationId);
  const showNote = notify.show;

  useEffect(() => {
    setConversationId(readId());
    // Notification clicks open the site with ?chat=open.
    if (new URLSearchParams(location.search).get("chat") === "open") setOpen(true);
  }, []);

  const remember = useCallback((id: string) => {
    setConversationId(id);
    try {
      localStorage.setItem("pb-chat-id", id);
    } catch {}
  }, []);

  // Poll: every 5 s while open (marks replies as read), every 25 s in the background (badge + notification).
  useEffect(() => {
    if (!conversationId) return;
    let alive = true;
    const load = async () => {
      const r = await fetch(`/api/chat?conversationId=${conversationId}${open && document.visibilityState === "visible" ? "&read=1" : ""}`).then((x) => x.json()).catch(() => null);
      if (!alive || !r) return;
      if (r.missing) {
        setConversationId(null);
        return;
      }
      const list: ThreadMessage[] = r.messages ?? [];
      const fresh = list.filter((m) => m.from === "STAFF" && !seen.current.has(m.id));
      if (seen.current.size && fresh.length) {
        if (!open) setUnread((u) => u + fresh.length);
        const last = fresh[fresh.length - 1];
        showNote("PB Mobiles replied", last.kind === "VOICE" ? "🎤 Voice note" : last.kind === "FILE" ? `📎 ${last.body}` : last.body, "/?chat=open");
      }
      list.forEach((m) => seen.current.add(m.id));
      setMsgs((prev) => {
        const links = new Map(prev.filter((m) => m.links).map((m) => [m.id, m.links]));
        return list.map((m) => (links.has(m.id) ? { ...m, links: links.get(m.id) } : m));
      });
    };
    load();
    const t = setInterval(load, open ? 5000 : 25000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [open, conversationId, showNote]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  async function sendText(body: string) {
    if (busy) return;
    const temp: ThreadMessage = { id: `tmp-${Date.now()}`, from: "VISITOR", kind: "TEXT", body, createdAt: new Date().toISOString(), pending: true };
    setMsgs((m) => [...m, temp]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: body, conversationId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.reply ?? data.error);
      if (data.conversationId && data.conversationId !== conversationId) remember(data.conversationId);
      [data.message, data.bot].filter(Boolean).forEach((m: ThreadMessage) => seen.current.add(m.id));
      setMsgs((m) => [...m.filter((x) => x.id !== temp.id), data.message, ...(data.bot ? [data.bot] : [])]);
    } catch (e) {
      setMsgs((m) => m.map((x) => (x.id === temp.id ? { ...x, pending: false, failed: e instanceof Error && e.message ? e.message : "Not sent" } : x)));
    } finally {
      setBusy(false);
    }
  }

  async function sendFile(file: File, voice?: { durationSec: number; waveform: number[] }) {
    const temp: ThreadMessage = { id: `tmp-${Date.now()}`, from: "VISITOR", kind: "TEXT", body: voice ? "🎤 Sending voice note…" : `📎 Sending ${file.name}…`, createdAt: new Date().toISOString(), pending: true };
    setMsgs((m) => [...m, temp]);
    const fd = new FormData();
    fd.set("file", file);
    if (conversationId) fd.set("conversationId", conversationId);
    if (voice) {
      fd.set("kind", "VOICE");
      fd.set("durationSec", String(voice.durationSec));
      fd.set("waveform", JSON.stringify(voice.waveform));
    }
    try {
      const res = await fetch("/api/chat/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.conversationId !== conversationId) remember(data.conversationId);
      seen.current.add(data.message.id);
      setMsgs((m) => [...m.filter((x) => x.id !== temp.id), data.message]);
    } catch (e) {
      setMsgs((m) => m.map((x) => (x.id === temp.id ? { ...x, pending: false, failed: e instanceof Error && e.message ? e.message : "Upload failed" } : x)));
    }
  }

  const fileUrl = (id: string) => `/api/files/${id}?c=${conversationId ?? ""}`;

  return (
    <div className="fixed bottom-4 right-4 z-[60] sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Chat with PB Mobiles"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="absolute bottom-16 right-0 flex h-[min(600px,calc(100svh-7rem))] w-[calc(100vw-2rem)] max-w-[390px] origin-bottom-right flex-col overflow-hidden rounded-3xl bg-[#07090d] text-white shadow-2xl ring-1 ring-gold/35"
            data-lenis-prevent
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-[#0d1522] to-[#07090d] px-4 py-3.5">
              <div aria-hidden className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue/30 blur-2xl" />
              <div aria-hidden className="absolute -bottom-12 left-10 h-24 w-24 rounded-full bg-red/25 blur-2xl" />
              <div className="relative flex items-center gap-3">
                <span className="display grid h-10 w-10 place-items-center rounded-xl bg-black text-sm italic ring-1 ring-gold/60">
                  <span><span className="text-blue">P</span><span className="text-red">B</span></span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">PB Mobiles Support</p>
                  <p className="flex items-center gap-1.5 text-xs text-white/60"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Typically replies in minutes</p>
                </div>
                {notify.supported && (
                  <button
                    onClick={notify.toggle}
                    disabled={notify.busy}
                    aria-pressed={notify.enabled}
                    aria-label={notify.enabled ? "Turn off notifications" : "Enable notifications"}
                    title={notify.enabled ? "Notifications on" : "Enable notifications"}
                    className={cn("grid h-9 w-9 place-items-center rounded-full transition", notify.enabled ? "bg-gold/20 text-gold" : "text-white/70 hover:bg-white/10")}
                  >
                    <Icon name={notify.enabled ? "bell" : "bell-off"} className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => setOpen(false)} aria-label="Close chat" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10">
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
            </div>
            {(notify.problem || (!notify.enabled && notify.supported && msgs.some((m) => m.from === "VISITOR"))) && (
              <button onClick={notify.toggle} className="flex items-center gap-2 bg-gold/10 px-4 py-2 text-left text-xs text-gold-soft">
                <Icon name="bell" className="h-3.5 w-3.5 shrink-0" />
                {notify.problem ?? "Enable notifications to know when we reply"}
              </button>
            )}

            <ChatThread
              side="VISITOR"
              messages={[WELCOME, ...msgs]}
              fileUrl={fileUrl}
              onText={sendText}
              onFile={sendFile}
              busy={busy}
              quick={
                <div className="flex gap-1.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
                  {QUICK.map((q) => (
                    <button key={q} onClick={() => sendText(q)} className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:border-gold hover:text-gold">{q}</button>
                  ))}
                </div>
              }
              footer={<p className="px-4 pb-2 text-center text-[0.62rem] text-white/35">Prefer WhatsApp? {BRAND.phone}</p>}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : unread ? `Chat with us — ${unread} new message${unread > 1 ? "s" : ""}` : "Chat with us"}
        aria-expanded={open}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="relative grid h-14 w-14 place-items-center rounded-full bg-[#07090d] text-white shadow-[0_12px_30px_-8px_rgba(0,0,0,.7)] ring-2 ring-gold/70"
      >
        <span aria-hidden className="absolute inset-0 rounded-full bg-gradient-to-br from-blue/40 to-red/40 opacity-70" />
        <Icon name={open ? "close" : "chat"} className="relative h-6 w-6" />
        {!open && (unread ? <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red px-1 text-[0.65rem] font-bold">{unread}</span> : <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full border-2 border-[#07090d] bg-red" />)}
      </motion.button>
    </div>
  );
}
