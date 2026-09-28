"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

const storeKey = (audience: string) => `pb-notify-${audience.toLowerCase()}`;
const noSubscribe = () => () => {};
const canNotify = () => "Notification" in window && "serviceWorker" in navigator;

/**
 * "Enable notifications" for the chat (master brief §13), on both the customer and staff side.
 *  - Asks the browser/phone for permission, registers /sw.js and (when VAPID keys are configured)
 *    a Web Push subscription, so messages arrive even when the site is closed.
 *  - `show()` also raises a notification while the site is open in a background tab.
 */
export function useChatNotifications(audience: "VISITOR" | "STAFF", conversationId?: string | null) {
  const supported = useSyncExternalStore(noSubscribe, canNotify, () => false);
  // Remembered choice (only counts while the browser permission is still granted).
  const remembered = useSyncExternalStore(
    noSubscribe,
    () => {
      try {
        return canNotify() && Notification.permission === "granted" && localStorage.getItem(storeKey(audience)) === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );
  const [choice, setEnabled] = useState<boolean | null>(null);
  const enabled = choice ?? remembered;
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const subscribe = useCallback(async () => {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    if (!VAPID || !("PushManager" in window)) return reg;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID) }));
    await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audience, conversationId: conversationId ?? null, subscription: sub.toJSON() }) });
    return reg;
  }, [audience, conversationId]);

  // Keep the server subscription attached to the current conversation.
  useEffect(() => {
    if (enabled && (audience === "STAFF" || conversationId)) subscribe().catch(() => {});
  }, [enabled, conversationId, audience, subscribe]);

  const toggle = useCallback(async () => {
    setProblem(null);
    if (!supported) {
      setProblem("This browser can't show notifications.");
      return;
    }
    setBusy(true);
    try {
      if (enabled) {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager?.getSubscription();
        if (sub) {
          await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
          await sub.unsubscribe();
        }
        setEnabled(false);
        try {
          localStorage.setItem(storeKey(audience), "0");
        } catch {}
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setProblem("Notifications are blocked — allow them in your browser settings.");
        return;
      }
      await subscribe();
      setEnabled(true);
      try {
        localStorage.setItem(storeKey(audience), "1");
      } catch {}
    } catch {
      setProblem("Couldn't turn on notifications on this device.");
    } finally {
      setBusy(false);
    }
  }, [supported, enabled, subscribe, audience]);

  /** In-page fallback: notify when a new message arrives while this tab is hidden. */
  const show = useCallback(
    async (title: string, body: string, url: string) => {
      if (!enabled || document.visibilityState === "visible") return;
      const reg = await navigator.serviceWorker.getRegistration();
      reg?.showNotification(title, { body, tag: `pb-${audience}`, icon: "/brand/pb-logo.webp", data: { url } }).catch(() => {});
    },
    [enabled, audience],
  );

  return { supported, enabled, busy, problem, toggle, show };
}
