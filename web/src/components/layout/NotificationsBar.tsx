"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { useChatNotifications } from "../chat/useChatNotifications";
import { Icon } from "../ui/Icon";

const chatId = () => {
  try {
    return localStorage.getItem("pb-chat-id");
  } catch {
    return null;
  }
};

/**
 * "Enable Notifications" at the very top of the homepage (v6 §9) — moved out of the chatbox so customers see
 * it without opening chat. Turns on browser / phone notifications for new broadcasts and replies to their chat.
 */
export function NotificationsBar() {
  const pathname = usePathname();
  const conversationId = useSyncExternalStore(() => () => {}, chatId, () => null);
  const notify = useChatNotifications("VISITOR", conversationId);
  if (pathname !== "/" || !notify.supported) return null;

  return (
    <div role="region" aria-label="Notifications" className="relative z-[51] overflow-hidden bg-black text-white">
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,119,217,.25),transparent_35%,transparent_65%,rgba(215,25,32,.25))]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      <div className="container-pb relative flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-sm">
        {notify.enabled ? (
          <>
            <span className="flex items-center gap-2 text-white/80"><Icon name="bell" className="h-4 w-4 text-gold" /> Notifications on — we&apos;ll let you know about offers and replies.</span>
            <button type="button" onClick={notify.toggle} disabled={notify.busy} className="text-xs text-white/50 underline-offset-4 hover:text-white hover:underline">Turn off</button>
          </>
        ) : (
          <>
            <span className="hidden text-white/70 sm:inline">Get offers, order and repair updates on this device.</span>
            <button type="button" onClick={notify.toggle} disabled={notify.busy} className="flex items-center gap-2 rounded-full bg-gold px-4 py-1.5 text-sm font-semibold text-[#120d02] transition hover:bg-gold-soft disabled:opacity-60">
              <Icon name="bell" className="h-4 w-4" /> {notify.busy ? "Please wait…" : "Enable Notifications"}
            </button>
          </>
        )}
        {notify.problem && <span role="alert" className="w-full text-center text-xs text-red sm:w-auto">{notify.problem}</span>}
      </div>
    </div>
  );
}
