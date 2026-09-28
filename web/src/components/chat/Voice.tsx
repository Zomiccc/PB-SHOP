"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";
import { Icon } from "../ui/Icon";

const BARS = 40;
const MAX_SECONDS = 120;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function pickMime() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) if (MediaRecorder.isTypeSupported(m)) return m;
  return "";
}

export type VoiceClip = { file: File; durationSec: number; waveform: number[] };

/**
 * Voice-note recorder with a familiar hold-free flow (master brief §13): tap the mic to record,
 * see the live waveform and timer, then send or cancel. Our own design — no WhatsApp branding.
 */
export function VoiceRecorder({ onSend, onCancel, dark = true }: { onSend: (clip: VoiceClip) => void; onCancel: () => void; dark?: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  const [live, setLive] = useState<number[]>(() => Array(BARS).fill(0.05));
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const peaks = useRef<number[]>([]);
  const started = useRef(0);
  const send = useRef(false);
  const stopAll = useRef<() => void>(() => {});
  const onSendRef = useRef(onSend);
  useEffect(() => {
    onSendRef.current = onSend;
  }, [onSend]);

  useEffect(() => {
    let raf = 0;
    let ctx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      const mime = pickMime();
      if (mime === null || !navigator.mediaDevices?.getUserMedia) {
        setError("Voice notes aren't supported in this browser.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      } catch {
        setError("Microphone access was blocked — allow it in your browser settings.");
        return;
      }
      if (cancelled) return stream.getTracks().forEach((t) => t.stop());
      ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      rec.current = r;
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        stream?.getTracks().forEach((t) => t.stop());
        ctx?.close().catch(() => {});
        if (!send.current) return;
        const type = r.mimeType || mime || "audio/webm";
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        const durationSec = (performance.now() - started.current) / 1000;
        // Compress the peaks gathered while recording into a fixed number of bars.
        const src = peaks.current.length ? peaks.current : [0.1];
        const bars = Array.from({ length: BARS }, (_, i) => {
          const slice = src.slice(Math.floor((i * src.length) / BARS), Math.max(Math.floor(((i + 1) * src.length) / BARS), Math.floor((i * src.length) / BARS) + 1));
          return Math.min(1, Math.max(0.06, Math.max(...slice)));
        });
        onSendRef.current({ file: new File(chunks.current, `voice-note.${ext}`, { type: type.split(";")[0] }), durationSec, waveform: bars.map((b) => Math.round(b * 100) / 100) });
      };
      started.current = performance.now();
      r.start(250);
      let last = 0;
      const tick = (t: number) => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128);
        const level = Math.min(1, peak * 1.8);
        if (t - last > 70) {
          last = t;
          peaks.current.push(level);
          setLive((l) => [...l.slice(1), Math.max(0.05, level)]);
          const secs = (performance.now() - started.current) / 1000;
          setElapsed(secs);
          if (secs >= MAX_SECONDS) stopAll.current();
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    })();
    stopAll.current = () => {
      cancelAnimationFrame(raf);
      if (rec.current?.state === "recording") {
        send.current = true;
        rec.current.stop();
      }
    };
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (rec.current?.state === "recording") {
        send.current = false;
        rec.current.stop();
      }
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (error) {
    return (
      <div className="flex flex-1 items-center gap-2 text-xs text-red">
        <span className="flex-1">{error}</span>
        <button type="button" onClick={onCancel} className="rounded-full px-3 py-1.5 hover:bg-white/10">OK</button>
      </div>
    );
  }
  return (
    <div className="flex flex-1 items-center gap-2" role="group" aria-label="Recording voice note">
      <button type="button" onClick={onCancel} aria-label="Cancel voice note" className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", dark ? "text-white/70 hover:bg-white/10" : "text-muted hover:bg-ink/5")}>
        <Icon name="trash" className="h-4 w-4" />
      </button>
      <span className="flex items-center gap-1.5 font-mono text-xs tabular-nums">
        <span className="h-2 w-2 animate-pulse rounded-full bg-red" />
        {fmt(elapsed)}
      </span>
      <div className="flex h-8 flex-1 items-center gap-[2px] overflow-hidden" aria-hidden>
        {live.map((v, i) => (
          <span key={i} className="w-[3px] shrink-0 rounded-full bg-gold" style={{ height: `${Math.max(8, v * 100)}%` }} />
        ))}
      </div>
      <button type="button" onClick={() => stopAll.current()} aria-label="Send voice note" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red text-white transition hover:bg-red-deep">
        <Icon name="send" className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Voice-note bubble: play / pause, waveform that fills as it plays, and the duration. */
export function VoiceNote({ src, durationSec, waveform, mine }: { src: string; durationSec: number | null; waveform: number[] | null; mine: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(durationSec ?? 0);
  const bars = waveform?.length ? waveform : Array(BARS).fill(0.3);

  return (
    <div className="flex w-56 max-w-full items-center gap-2.5">
      <button
        type="button"
        onClick={() => {
          const a = audio.current;
          if (!a) return;
          if (a.paused) a.play().catch(() => {});
          else a.pause();
        }}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", mine ? "bg-white text-blue" : "bg-gold text-[#120d02]")}
      >
        <Icon name={playing ? "pause" : "play"} className="h-4 w-4" strokeWidth={2.4} />
      </button>
      <div
        className="flex h-8 flex-1 cursor-pointer items-center gap-[2px]"
        onClick={(e) => {
          const a = audio.current;
          if (!a || !a.duration || !isFinite(a.duration)) return;
          const r = e.currentTarget.getBoundingClientRect();
          a.currentTime = ((e.clientX - r.left) / r.width) * a.duration;
        }}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        {bars.map((v, i) => (
          <span key={i} className={cn("w-[3px] flex-1 rounded-full transition-colors", i / bars.length < progress ? (mine ? "bg-white" : "bg-gold") : mine ? "bg-white/40" : "bg-white/25")} style={{ height: `${Math.max(12, v * 100)}%` }} />
        ))}
      </div>
      <span className="w-9 shrink-0 text-right font-mono text-[0.65rem] tabular-nums opacity-80">{fmt(playing || progress > 0 ? progress * duration : duration)}</span>
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        onLoadedMetadata={(e) => isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => {
          const d = isFinite(e.currentTarget.duration) ? e.currentTarget.duration : duration;
          if (d) setProgress(e.currentTarget.currentTime / d);
        }}
      />
    </div>
  );
}
