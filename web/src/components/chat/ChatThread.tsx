"use client";

import { useEffect, useRef, useState } from "react";
import { cn, humanSize } from "@/lib/format";
import { Icon } from "../ui/Icon";
import { shrinkImage } from "../ui/FileField";
import { VoiceNote, VoiceRecorder, type VoiceClip } from "./Voice";

export type ThreadMessage = {
  id: string;
  from: "VISITOR" | "BOT" | "STAFF";
  kind: "TEXT" | "FILE" | "VOICE";
  body: string;
  staffName?: string | null;
  createdAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  durationSec?: number | null;
  waveform?: number[] | null;
  attachments?: { id: string; fileName: string; mimeType: string; size: number }[];
  links?: { label: string; href: string }[];
  pending?: boolean;
  failed?: string;
};

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" });
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/gif,application/pdf,.docx,.xlsx";

/**
 * One chat thread for either side (master brief §13): text, files and voice notes, with
 * sent / delivered / read ticks on your own messages.
 */
export function ChatThread({
  side,
  messages,
  fileUrl,
  onText,
  onFile,
  busy,
  placeholder = "Type a message…",
  footer,
  quick,
}: {
  side: "VISITOR" | "STAFF";
  messages: ThreadMessage[];
  fileUrl: (id: string) => string;
  onText: (text: string) => void;
  onFile: (file: File, voice?: Omit<VoiceClip, "file">) => void;
  busy?: boolean;
  placeholder?: string;
  footer?: React.ReactNode;
  quick?: React.ReactNode;
}) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const mineFrom = side === "VISITOR" ? "VISITOR" : "STAFF";

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  return (
    <>
      <div ref={list} className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite" data-lenis-prevent>
        {messages.map((m) => {
          const mine = m.from === mineFrom;
          return (
            <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
              <div className={cn("max-w-[84%] rounded-2xl px-3.5 py-2.5 text-sm", mine ? "rounded-br-md bg-blue text-white" : "rounded-bl-md bg-white/[0.07] text-white ring-1 ring-white/10", m.failed && "ring-2 ring-red")}>
                {!mine && m.from === "STAFF" && m.staffName && <p className="mb-0.5 text-[0.65rem] font-semibold text-gold">{m.staffName} · PB Mobiles</p>}
                {m.kind === "VOICE" && m.attachments?.[0] ? (
                  <VoiceNote src={fileUrl(m.attachments[0].id)} durationSec={m.durationSec ?? null} waveform={m.waveform ?? null} mine={mine} />
                ) : m.kind === "FILE" && m.attachments?.[0] ? (
                  <FileBubble a={m.attachments[0]} href={fileUrl(m.attachments[0].id)} />
                ) : (
                  <p className="whitespace-pre-line break-words">{m.body}</p>
                )}
                {m.links && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.links.map((l) => (
                      <a key={l.href} href={l.href} className="rounded-full bg-gold px-3 py-1 text-xs font-semibold text-[#120d02] hover:bg-gold-soft">{l.label} →</a>
                    ))}
                  </div>
                )}
                <p className={cn("mt-1 flex items-center justify-end gap-1 text-[0.62rem]", mine ? "text-white/70" : "text-white/40")}>
                  {m.failed ? <span className="text-red">{m.failed}</span> : time(m.createdAt)}
                  {mine && !m.failed && <Ticks m={m} />}
                </p>
              </div>
            </div>
          );
        })}
        {busy && (
          <div className="flex gap-1 px-2" aria-label="Typing">
            {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-gold" style={{ animationDelay: `${i * 0.12}s` }} />)}
          </div>
        )}
      </div>

      {quick}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onText(text.trim());
          setText("");
        }}
        className="flex items-center gap-1.5 border-t border-white/10 p-2.5"
      >
        {recording ? (
          <VoiceRecorder
            onCancel={() => setRecording(false)}
            onSend={(clip) => {
              setRecording(false);
              if (clip.durationSec < 0.6) return;
              onFile(clip.file, { durationSec: clip.durationSec, waveform: clip.waveform });
            }}
          />
        ) : (
          <>
            <button type="button" onClick={() => picker.current?.click()} aria-label="Attach a file" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
              <Icon name="clip" className="h-5 w-5" />
            </button>
            <input
              ref={picker}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) onFile(await shrinkImage(f));
              }}
            />
            <label htmlFor={`chat-input-${side}`} className="sr-only">Message</label>
            <input
              id={`chat-input-${side}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              maxLength={2000}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-full bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue"
            />
            {text.trim() ? (
              <button type="submit" aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red text-white transition hover:bg-red-deep">
                <Icon name="send" className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={() => setRecording(true)} aria-label="Record a voice note" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold text-[#120d02] transition hover:bg-gold-soft">
                <Icon name="mic" className="h-5 w-5" />
              </button>
            )}
          </>
        )}
      </form>
      {footer}
    </>
  );
}

function Ticks({ m }: { m: ThreadMessage }) {
  if (m.pending) return <Icon name="clock" className="h-3 w-3" />;
  const read = !!m.readAt;
  const delivered = read || !!m.deliveredAt;
  return (
    <span aria-label={read ? "Read" : delivered ? "Delivered" : "Sent"} className={cn("flex", read ? "text-gold-soft" : "")}>
      <Icon name="check" className="h-3 w-3" strokeWidth={2.6} />
      {delivered && <Icon name="check" className="-ml-1.5 h-3 w-3" strokeWidth={2.6} />}
    </span>
  );
}

function FileBubble({ a, href }: { a: { fileName: string; mimeType: string; size: number }; href: string }) {
  if (/^image\/(jpeg|png|webp|gif)$/.test(a.mimeType)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={href} alt={a.fileName} loading="lazy" className="max-h-56 w-full rounded-xl object-cover" />
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-2.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black/25"><Icon name="doc" className="h-5 w-5" /></span>
      <span className="min-w-0">
        <span className="block truncate font-medium">{a.fileName}</span>
        <span className="text-[0.7rem] opacity-70">{humanSize(a.size)} · tap to open</span>
      </span>
    </a>
  );
}
