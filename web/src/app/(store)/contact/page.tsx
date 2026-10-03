import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";
import { ContactForm } from "@/components/ContactForm";
import { Icon } from "@/components/ui/Icon";
import { BRAND } from "@/lib/constants";
import { StoreLink, T } from "@/components/site/Editable";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Call, WhatsApp or visit PB Mobiles & Repairing Lab. Opening hours, address, map and contact form.",
};

export default async function ContactPage(props: PageProps<"/contact">) {
  const { subject } = await props.searchParams;
  const mapQuery = encodeURIComponent(`${BRAND.full} ${BRAND.address}`);

  return (
    <>
      <PageHero k="page.contact" eyebrow="Contact" title="Talk to" accent="a real person." intro="Questions about a phone, a repair or an order? Call, WhatsApp, message us here — or just walk in." />
      <section className="pb-24">
        <div className="container-pb grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <StoreLink type="tel" k="store.phone" d={BRAND.phone} className="card flex items-center gap-4 p-5 transition hover:shadow-[var(--shadow-lift)]">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-navy-950 text-gold"><Icon name="call" /></span>
              <span><span className="label !mb-0"><T k="page.contact.call" d="Call" /></span><span className="font-semibold"><T k="store.phone" d={BRAND.phone} /></span></span>
            </StoreLink>
            <StoreLink type="wa" k="store.whatsapp" d={BRAND.whatsapp} className="card flex items-center gap-4 p-5 transition hover:shadow-[var(--shadow-lift)]">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-600 text-white"><Icon name="chat" /></span>
              <span><span className="label !mb-0"><T k="page.contact.whatsapp" d="WhatsApp — direct message" /></span><span className="font-semibold"><T k="page.contact.whatsapp.text" d="Chat with the shop" /></span><span className="block text-xs text-muted">WhatsApp number: <T k="store.whatsapp" d={BRAND.whatsapp} /></span></span>
            </StoreLink>
            <StoreLink type="mailto" k="store.email" d={BRAND.email} className="card flex items-center gap-4 p-5 transition hover:shadow-[var(--shadow-lift)]">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-blue text-white"><Icon name="mail" /></span>
              <span><span className="label !mb-0"><T k="page.contact.email" d="Email" /></span><span className="font-semibold"><T k="store.email" d={BRAND.email} /></span></span>
            </StoreLink>
            <div className="card flex gap-4 p-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-red text-white"><Icon name="clock" /></span>
              <div>
                <span className="label !mb-1"><T k="page.contact.hours" d="Opening hours" /></span>
                <p className="text-sm"><T k="store.hours" d={BRAND.hours.map((h) => `${h.days} · ${h.time}`).join("\n")} multiline /></p>
              </div>
            </div>
            <div className="overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3 bg-navy-950 p-4 text-sm text-white">
                <Icon name="pin" className="h-5 w-5 text-gold" /> <T k="store.address" d={BRAND.address} multiline />
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
