import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";
import { BRAND } from "@/lib/constants";

export const metadata: Metadata = { title: "Terms & Conditions", description: "Terms for purchases, repairs, payments, returns, used devices, warranties and customer responsibilities at PB Mobiles." };

const SECTIONS = [
  { id: "general", title: "General" },
  { id: "purchases", title: "Purchases" },
  { id: "payments", title: "Payments" },
  { id: "used", title: "Used devices" },
  { id: "repairs", title: "Repairs" },
  { id: "returns", title: "Returns & refunds" },
  { id: "warranty", title: "Warranties" },
  { id: "loyalty", title: "Passport & Care Card" },
  { id: "responsibilities", title: "Customer responsibilities" },
  { id: "liability", title: "Liability" },
  { id: "contact", title: "Contact" },
];

export default function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions" updated="September 2026" sections={SECTIONS}>
      <h2 id="general">1. General</h2>
      <p>These terms apply to all purchases, repairs and services provided by {BRAND.full} (&quot;PB Mobiles&quot;, &quot;we&quot;, &quot;us&quot;) in store and through this website. By placing an order or booking a repair you agree to these terms.</p>

      <h2 id="purchases">2. Purchases</h2>
      <ul>
        <li>All prices are in Pakistani Rupees (PKR) and include applicable taxes unless stated otherwise.</li>
        <li>Product images, including 3D previews, are illustrative. Colour and finish may vary slightly from what you see on screen.</li>
        <li>An order is confirmed only after payment is verified (or, for cash on delivery, once we confirm the order with you). We may cancel and fully refund an order if an item becomes unavailable or a pricing error occurs.</li>
        <li>PTA / regulatory status of devices is stated on the product page where relevant.</li>
      </ul>

      <h2 id="payments">3. Payments</h2>
      <ul>
        <li>Online payments are processed by a licensed Pakistani payment gateway (mobile wallet, bank account / direct debit, or card, depending on availability).</li>
        <li>PB Mobiles never receives or stores your card number, bank login or wallet PIN.</li>
        <li>If a payment is shown as pending, we will confirm the order once the gateway verifies it. Failed payments are not charged; if money is deducted in error it is reversed according to the gateway&apos;s and your bank&apos;s timelines.</li>
      </ul>

      <h2 id="used">4. Used devices</h2>
      <ul>
        <li>Used devices are inspected and graded (A+, A, B, C) by our lab. Grades describe cosmetic condition; all listed devices are functional unless stated.</li>
        <li>Battery health is shown where the device reports it. Batteries are consumable and degrade with use.</li>
        <li>Condition notes on each listing form part of the description of the device you buy.</li>
      </ul>

      <h2 id="repairs">5. Repairs</h2>
      <ul>
        <li>Every repair begins with a diagnosis. We will give you a quote and ask for approval before carrying out paid work.</li>
        <li>Repair estimates may change if further faults are found; we will contact you for approval before continuing.</li>
        <li>Devices with liquid damage, prior third-party repairs or board-level faults may carry a higher risk of further failure. We will explain any such risk before starting.</li>
        <li>Devices not collected within 60 days of being marked &quot;Ready&quot; may incur a storage fee, after notice.</li>
        <li>Your repair reference (PBR-…) and phone number are required to track or collect a repair.</li>
      </ul>

      <h2 id="returns">6. Returns &amp; refunds</h2>
      <p>See our <a href="/returns" className="text-blue underline">Returns &amp; Warranty policy</a> for full details. In summary: unopened new accessories within 7 days; used devices within 7 days if they do not match their listed grade; faulty items are handled under warranty. Refunds are made to the original payment method once the return is finalised.</p>

      <h2 id="warranty">7. Warranties</h2>
      <ul>
        <li>New phones carry the manufacturer&apos;s warranty where applicable.</li>
        <li>Used phones carry a 30-day PB Lab hardware warranty unless otherwise stated.</li>
        <li>Repairs carry a warranty on the replaced part and workmanship for the period stated on your invoice.</li>
        <li>Warranties do not cover accidental damage, liquid damage, misuse, or repairs by third parties after our service.</li>
      </ul>

      <h2 id="loyalty">8. PB Phone Passport &amp; Care Card</h2>
      <ul>
        <li>Points are earned on eligible purchases and repairs, have no cash value, and expire as stated on the Loyalty page.</li>
        <li>A PB Care Card is issued with eligible purchases and may be used up to 5 times; each listed free service may be redeemed once per card.</li>
        <li>PB Mobiles may update rewards, rules and Care Card services; the current rules are always shown on the Loyalty page.</li>
      </ul>

      <h2 id="responsibilities">9. Customer responsibilities</h2>
      <ul>
        <li>Back up your data before handing in a device. We are not responsible for data loss during repair.</li>
        <li>Remove SIM/memory cards and disable Find My / device locks where asked, or provide access so the device can be tested.</li>
        <li>Provide accurate contact and delivery details, and inspect deliveries on arrival.</li>
        <li>Ensure devices you bring for repair are legally yours or you are authorised to have them repaired.</li>
      </ul>

      <h2 id="liability">10. Liability</h2>
      <p>Nothing in these terms limits your rights under applicable Pakistani consumer protection law. Our total liability for any claim is limited to the amount you paid for the relevant product or service, except where the law does not allow such a limitation.</p>

      <h2 id="contact">11. Contact</h2>
      <p>{BRAND.full} · {BRAND.address} · {BRAND.phone} · {BRAND.email}</p>
    </LegalPage>
  );
}
