import "server-only";
import { db } from "./db";

/**
 * Phone / browser notifications for chat (master brief §13) via standard Web Push.
 * Needs VAPID keys (generate once: `npx web-push generate-vapid-keys`):
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@shop.pk)
 * Without keys, notifications still appear while the site is open in a tab (see the chat widget).
 */
export const pushConfigured = () => !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

type Payload = { title: string; body: string; url: string; tag?: string };

async function send(subs: { id: string; endpoint: string; p256dh: string; auth: string }[], payload: Payload) {
  if (!subs.length || !pushConfigured()) return 0;
  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:info@pbmobiles.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600 });
        sent++;
      } catch (e) {
        // 404/410 = the browser dropped the subscription; forget it.
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
      }
    }),
  );
  return sent;
}

/** A staff reply → the customer's phone / browser. */
export async function notifyVisitor(conversationId: string, preview: string) {
  const subs = await db.pushSubscription.findMany({ where: { audience: "VISITOR", conversationId } });
  return send(subs, { title: "PB Mobiles replied", body: preview, url: "/?chat=open", tag: `chat-${conversationId}` });
}

/**
 * A newly published broadcast → every customer browser that turned on "Enable Notifications" at the top of the
 * homepage (v6 §9), whether or not they've chatted with us.
 */
export async function notifyVisitorsBroadcast(message: string) {
  const subs = await db.pushSubscription.findMany({ where: { audience: "VISITOR" } });
  return send(subs, { title: "PB Mobiles", body: message.slice(0, 160), url: "/", tag: "broadcast" });
}

/** A customer message → every staff member who turned notifications on. */
export async function notifyStaffChat(conversationId: string, preview: string) {
  const subs = await db.pushSubscription.findMany({ where: { audience: "STAFF" } });
  return send(subs, { title: "New website chat message", body: preview, url: `/admin/inbox?tab=chat&c=${conversationId}`, tag: `staff-chat-${conversationId}` });
}
