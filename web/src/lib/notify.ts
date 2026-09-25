/**
 * Customer notifications (order confirmations, repair status, OTP). Each channel activates
 * automatically when its environment variables are set; otherwise messages are logged only,
 * so nothing breaks before the client picks providers.
 *
 *  WhatsApp  — Meta WhatsApp Business Cloud API: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 *              (business-initiated messages need approved templates; WHATSAPP_TEMPLATE_* names)
 *  SMS       — any HTTP SMS gateway: SMS_API_URL (+ SMS_API_KEY), posts {to, message}
 *  Email     — Resend: RESEND_API_KEY, EMAIL_FROM
 */

type Message = { to: { phone?: string | null; email?: string | null }; subject: string; text: string };

const intlPk = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("92") ? d : d.startsWith("0") ? `92${d.slice(1)}` : `92${d}`;
};

async function whatsapp(phone: string, text: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !id) return false;
  const res = await fetch(`https://graph.facebook.com/v21.0/${id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(
      process.env.WHATSAPP_TEMPLATE_GENERIC
        ? { messaging_product: "whatsapp", to: intlPk(phone), type: "template", template: { name: process.env.WHATSAPP_TEMPLATE_GENERIC, language: { code: "en" }, components: [{ type: "body", parameters: [{ type: "text", text }] }] } }
        : { messaging_product: "whatsapp", to: intlPk(phone), type: "text", text: { body: text } },
    ),
  });
  return res.ok;
}

async function sms(phone: string, text: string) {
  const url = process.env.SMS_API_URL;
  if (!url) return false;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(process.env.SMS_API_KEY ? { Authorization: `Bearer ${process.env.SMS_API_KEY}` } : {}) },
    body: JSON.stringify({ to: intlPk(phone), message: text }),
  });
  return res.ok;
}

async function email(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "PB Mobiles <no-reply@pbmobiles.pk>", to, subject, text }),
  });
  return res.ok;
}

/** Fire-and-forget: never throws, never blocks the business action that triggered it. */
export async function notify(msg: Message) {
  try {
    let sent = false;
    if (msg.to.phone) sent = (await whatsapp(msg.to.phone, msg.text).catch(() => false)) || (await sms(msg.to.phone, msg.text).catch(() => false));
    if (msg.to.email) sent = (await email(msg.to.email, msg.subject, msg.text).catch(() => false)) || sent;
    if (!sent && process.env.NODE_ENV !== "test") console.info(`[notify:log-only] ${msg.subject} → ${msg.to.phone ?? msg.to.email}: ${msg.text}`);
  } catch (e) {
    console.error("[notify] failed", e);
  }
}

export async function notifyStaff(subject: string, text: string) {
  const to = process.env.STAFF_ALERT_EMAIL;
  if (to) await email(to, subject, text).catch(() => false);
}
