import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { like } from "@/lib/search";
import { BRAND } from "@/lib/constants";
import { ipFrom, rateLimit } from "@/lib/rate-limit";

const Body = z.object({ message: z.string().trim().min(1).max(1000), conversationId: z.string().nullish() });

type Reply = { reply: string; links?: { label: string; href: string }[] };

/**
 * Rule-based first responder. Every message is stored so staff can pick the conversation up
 * from the admin dashboard. Swap `answer()` for an AI assistant or live-chat provider later
 * without changing the widget.
 */
async function answer(raw: string): Promise<Reply> {
  const m = raw.toLowerCase();
  const wa = `https://wa.me/${BRAND.whatsapp}`;

  const track = m.match(/pbr-?\s?(\d{3,6})/i);
  if (track) {
    const ref = `PBR-${track[1]}`;
    const r = await db.repairRequest.findUnique({ where: { ref } });
    if (r) return { reply: `Repair ${ref} (${r.brand} ${r.model}) is currently: ${r.status.replace("_", " ").toLowerCase()}.`, links: [{ label: "Track repair", href: `/repair/track?ref=${ref}` }] };
    return { reply: `I couldn't find repair ${ref}. Please check the reference on your confirmation.` };
  }
  if (/(track|status).*(repair)|repair.*(status|track)/.test(m)) {
    return { reply: "Send me your repair reference (e.g. PBR-1042) and I'll check its status, or use the tracking page.", links: [{ label: "Track a repair", href: "/repair/track" }] };
  }
  if (/repair|broken|crack|screen|battery|charging|water|fix/.test(m)) {
    return { reply: "We repair screens, batteries, charging ports, cameras, water damage and more. Book online and you'll get a repair reference straight away.", links: [{ label: "Book a repair", href: "/repair" }] };
  }
  if (/hour|open|timing|close/.test(m)) {
    return { reply: BRAND.hours.map((h) => `${h.days}: ${h.time}`).join("\n") };
  }
  if (/pay|jazz|easypaisa|card|bank|cod|cash/.test(m)) {
    return { reply: "You can pay online by mobile wallet, bank account or card through our secure Pakistani payment gateway, or choose cash on delivery where available. We never store your card or bank details." };
  }
  if (/used|second|pre-?owned|grade/.test(m)) {
    return { reply: "Every used phone is tested by our lab, graded A+ to C, and listed with battery health and notes, plus a 30-day PB Lab warranty.", links: [{ label: "Used phones", href: "/used-phones" }] };
  }
  if (/passport|loyal|point|reward|care card/.test(m)) {
    return { reply: "The PB Phone Passport earns points on purchases and repairs. Eligible phones also come with a PB Care Card of up to 5 free service visits.", links: [{ label: "PB Phone Passport", href: "/loyalty" }] };
  }
  if (/tablet|ipad|galaxy tab|\bpad\b/.test(m)) {
    return { reply: "We stock new and lab-checked used tablets — iPad, Galaxy Tab, Xiaomi Pad and more.", links: [{ label: "Tablets", href: "/tablets" }] };
  }
  if (/access|case|charger|cable|protector|power ?bank|earbud|airpod/.test(m)) {
    return { reply: "We stock cases, chargers, cables, screen protectors, power banks and earbuds.", links: [{ label: "Accessories", href: "/accessories" }] };
  }
  const phone = await db.product.findFirst({
    where: { active: true, type: "PHONE", OR: m.split(/\s+/).filter((w) => w.length > 2).slice(0, 6).map((w) => ({ name: like(w) })) },
    include: { variants: true },
  });
  if (phone) {
    const stock = phone.variants.reduce((s, v) => s + v.stockQty, 0);
    return {
      reply: stock > 0 ? `Yes — ${phone.name}${phone.condition === "USED" ? " (used)" : ""} is in stock right now.` : `${phone.name} is currently out of stock. Message us and we'll let you know when it's back.`,
      links: [{ label: "View phone", href: `/product/${phone.slug}` }],
    };
  }
  if (/hi|hello|salam|assalam|hey/.test(m)) return { reply: "Wa alaikum assalam / hello! How can we help today?" };
  return { reply: `Thanks! A member of our team will reply soon. For a faster answer you can WhatsApp us on ${BRAND.phone}.`, links: [{ label: "WhatsApp us", href: wa }] };
}

/** Conversation history — lets the widget show replies staff send from the admin inbox. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("conversationId");
  if (!id) return NextResponse.json({ messages: [] });
  const messages = await db.chatMessage.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" }, take: 100 });
  return NextResponse.json({ messages: messages.map((m) => ({ from: m.from, body: m.body })) });
}

export async function POST(req: Request) {
  if (!rateLimit(`chat:${ipFrom(req)}`, 30, 60_000).ok) return NextResponse.json({ reply: "You're sending messages very quickly — please wait a moment." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  const { message, conversationId } = parsed.data;

  let convo = conversationId ? await db.chatConversation.findUnique({ where: { id: conversationId } }) : null;
  if (!convo) convo = await db.chatConversation.create({ data: { visitorId: crypto.randomUUID() } });

  const reply = await answer(message);
  await db.chatMessage.createMany({
    data: [
      { conversationId: convo.id, from: "VISITOR", body: message },
      { conversationId: convo.id, from: "BOT", body: reply.reply },
    ],
  });
  await db.chatConversation.update({ where: { id: convo.id }, data: { updatedAt: new Date() } });

  return NextResponse.json({ conversationId: convo.id, ...reply });
}
