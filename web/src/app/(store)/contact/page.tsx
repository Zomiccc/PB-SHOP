import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";
import { ContactForm } from "@/components/ContactForm";
import { Icon } from "@/components/ui/Icon";
import { BRAND } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Call, WhatsApp or visit PB Mobiles & Repairing Lab. Opening hours, address, map and contact form.",
};

export default async function ContactPage(props: PageProps<"/contact">) {
  const { subject } = await props.searchParams;
  const mapQuery = encodeURIComponent(`${BRAND.full} ${BRAND.address}`);

  return (
    <>
      <PageHero eyebrow="Contact" title="Talk to" accent="a real person." intro="Questions about a phone, a repair or an order? Call, WhatsApp, message us here — or just walk in." />
      <section className="pb-24">
        <div className="container-pb grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <a href={`tel:${BRAND.phone.replace(/\s/g, "")}`} className="card flex items-center gap-4 p-5 transition hover:shadow-[var(--shadow-lift)]">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-navy-950 text-gold"><Icon name="call" /></span>
              <span><span className="label !mb-0">Call</span><span className="font-semibold">{BRAND.phone}</span></span>
            </a>
            <a href={`https://wa.me/${BRAND.whatsapp}`} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-4 p-5 transition hover:shadow-[var(--shadow-lift)]">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-600 text-white"><Icon name="chat" /></span>
              <span><span className="label !mb-0">WhatsApp — direct message</span><span className="font-semibold">Chat with the shop</span></span>
            </a>
            <a href={`mailto:${BRAND.email}`} className="card flex items-center gap-4 p-5 transition hover:shadow-[var(--shadow-lift)]">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-blue text-white"><Icon name="mail" /></span>
              <span><span className="label !mb-0">Email</span><span className="font-semibold">{BRAND.email}</span></span>
            </a>
            <div className="card flex gap-4 p-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-red text-white"><Icon name="clock" /></span>
              <div>
                <span className="label !mb-1">Opening hours</span>
                {BRAND.hours.map((h) => (
                  <p key={h.days} className="text-sm"><b>{h.days}</b> · {h.time}</p>
                ))}
              </div>
            </div>
            <div className="overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3 bg-navy-950 p-4 text-sm text-white">
                <Icon name="pin" className="h-5 w-5 text-gold" /> {BRAND.address}
              </div>
              <iframe
                title="PB Mobiles location map"
                src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-72 w-full border-0"
              />
            </div>
          </div>
          <ContactForm subject={typeof subject === "string" ? subject : undefined} />
        </div>
      </section>
    </>
  );
}
