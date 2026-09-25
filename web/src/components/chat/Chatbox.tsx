"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BRAND } from "@/lib/constants";
import { Icon } from "../ui/Icon";

type Msg = { from: "VISITOR" | "BOT" | "STAFF"; body: string; links?: { label: string; href: string }[] };

const QUICK = ["Book a repair", "Check phone availability", "Track my repair", "Opening hours", "Payment options"];

/**
 * Site-wide chatbox (§9), restyled in the PB palette. Messages are stored server-side
 * (/api/chat) so staff can follow up; the bot answers common questions and hands off to
 * WhatsApp / staff. The previous site's chat provider (if any) can be wired into the same API.
 */
export function Chatbox() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "BOT", body: "Hi! 👋 Welcome to PB Mobiles & Repairing Lab. Ask about a phone, a repair or an order — or pick an option below." },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(() => {
    try {
      return typeof window === "undefined" ? null : localStorage.getItem("pb-chat-id");
    } catch {
      return null;
    }
  });
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  // While open, pull the stored conversation so replies typed by staff in the admin inbox appear.
  useEffect(() => {
    if (!open || !conversationId) return;
    let alive = true;
    const load = async () => {
      const r = await fetch(`/api/chat?conversationId=${conversationId}`).then((x) => x.json()).catch(() => null);
      if (alive && r?.messages?.length) setMsgs((m) => [m[0], ...r.messages]);
    };
    load();
    const t = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [open, conversationId]);

  async function send(body: string) {
    const trimmed = body.trim();
    if (!trimmed || busy) return;
    setMsgs((m) => [...m, { from: "VISITOR", body: trimmed }]);
    setText("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, conversationId }),
      });
      const data = await res.json();
      if (data.conversationId && data.conversationId !== conversationId) {
        setConversationId(data.conversationId);
        try {
          localStorage.setItem("pb-chat-id", data.conversationId);
        } catch {}
      }
      setMsgs((m) => [...m, { from: "BOT", body: data.reply, links: data.links }]);
    } catch {
      setMsgs((m) => [...m, { from: "BOT", body: `Sorry, something went wrong. You can reach us on WhatsApp at ${BRAND.phone}.` }]);
    } finally {
      setBusy(false);
    }
  }

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
            className="absolute bottom-16 right-0 flex h-[min(560px,calc(100svh-7rem))] w-[calc(100vw-2rem)] max-w-[380px] origin-bottom-right flex-col overflow-hidden rounded-3xl bg-navy-950 text-white shadow-2xl ring-1 ring-gold/30"
            data-lenis-prevent
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-navy-900 to-navy-950 px-5 py-4">
              <div aria-hidden className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue/30 blur-2xl" />
              <div aria-hidden className="absolute -bottom-12 left-10 h-24 w-24 rounded-full bg-red/25 blur-2xl" />
              <div className="relative flex items-center gap-3">
                <span className="display grid h-10 w-10 place-items-center rounded-xl bg-navy-950 text-sm italic ring-1 ring-gold/60">
                  <span><span className="text-blue">P</span><span className="text-red">B</span></span>
                </span>
                <div className="flex-1">
                  <p className="font-semibold">PB Mobiles Support</p>
                  <p className="flex items-center gap-1.5 text-xs text-white/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Typically replies in minutes
                  </p>
                </div>
                <button onClick={() => setOpen(false)} aria-label="Close chat" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10">
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div ref={list} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
              {msgs.map((m, i) => (
                <div key={i} className={m.from === "VISITOR" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      m.from === "VISITOR"
                        ? "max-w-[82%] rounded-2xl rounded-br-md bg-blue px-3.5 py-2.5 text-sm"
                        : "max-w-[82%] rounded-2xl rounded-bl-md bg-white/[0.07] px-3.5 py-2.5 text-sm ring-1 ring-white/10"
                    }
                  >
                    <p className="whitespace-pre-line">{m.body}</p>
                    {m.links && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.links.map((l) => (
                          <a key={l.href} href={l.href} className="rounded-full bg-gold px-3 py-1 text-xs font-semibold text-navy-950 hover:bg-gold-soft">
                            {l.label} →
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex gap-1 px-2" aria-label="Typing">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold" style={{ animationDelay: `${i * 0.12}s` }} />
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-1.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
              {QUICK.map((q) => (
                <button key={q} onClick={() => send(q)} className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:border-gold hover:text-gold">
                  {q}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(text);
              }}
              className="flex items-center gap-2 border-t border-white/10 p-3"
            >
              <label htmlFor="chat-input" className="sr-only">Message</label>
              <input
                id="chat-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message…"
                maxLength={1000}
                className="flex-1 rounded-full bg-white/[0.06] px-4 py-2.5 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue"
              />
              <button type="submit" disabled={!text.trim() || busy} aria-label="Send" className="grid h-10 w-10 place-items-center rounded-full bg-red transition hover:bg-red-deep disabled:opacity-40">
                <Icon name="send" className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Chat with us"}
        aria-expanded={open}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="relative grid h-14 w-14 place-items-center rounded-full bg-navy-950 text-white shadow-[0_12px_30px_-8px_rgba(7,26,43,.6)] ring-2 ring-gold/70"
      >
        <span aria-hidden className="absolute inset-0 rounded-full bg-gradient-to-br from-blue/40 to-red/40 opacity-70" />
        <Icon name={open ? "close" : "chat"} className="relative h-6 w-6" />
        {!open && <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full border-2 border-navy-950 bg-red" />}
      </motion.button>
    </div>
  );
}
