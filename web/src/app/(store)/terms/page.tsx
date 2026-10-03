import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";
import { BRAND } from "@/lib/constants";
import { T } from "@/components/site/Editable";

export const metadata: Metadata = { title: "Terms & Conditions", description: "Terms for purchases, repairs, payments, returns, used devices, warranties and customer responsibilities at PB Mobiles." };

const SECTIONS = [
  { id: "general", title: "General" },
  { id: "purchases", title: "Purchases" },
  { id: "payments", title: "Payments" },
  { id: "used", title: "Used devices" },
  { id: "repairs", title: "Repairs" },
  { id: "returns", title: "Returns & refunds" },
  { id: "warranty", title: "Warranties" },
  { id: "loyalty", title: "PB Rewards" },
  { id: "responsibilities", title: "Customer responsibilities" },
  { id: "liability", title: "Liability" },
  { id: "contact", title: "Contact" },
];

export default function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions" updated="September 2026" sections={SECTIONS}>
      <h2 id="general"><T k="legal.terms.1" d={"1. General"} multiline /></h2>
      <p>These terms apply to all purchases, repairs and services provided by {BRAND.full} (&quot;PB Mobiles&quot;, &quot;we&quot;, &quot;us&quot;) in store and through this website. By placing an order or booking a repair you agree to these terms.</p>

      <h2 id="purchases"><T k="legal.terms.2" d={"2. Purchases"} multiline /></h2>
      <ul>
        <li><T k="legal.terms.3" d={"All prices are in Pakistani Rupees (PKR) and include applicable taxes unless stated otherwise."} multiline /></li>
        <li><T k="legal.terms.4" d={"Product images, including 3D previews, are illustrative. Colour and finish may vary slightly from what you see on screen."} multiline /></li>
        <li><T k="legal.terms.5" d={"An order is confirmed only after payment is verified (or, for cash on delivery, once we confirm the order with you). We may cancel and fully refund an order if an item becomes unavailable or a pricing error occurs."} multiline /></li>
        <li><T k="legal.terms.6" d={"PTA / regulatory status of devices is stated on the product page where relevant."} multiline /></li>
      </ul>

      <h2 id="payments"><T k="legal.terms.7" d={"3. Payments"} multiline /></h2>
      <ul>
        <li><T k="legal.terms.8" d={"Online payments are processed by a licensed Pakistani payment gateway (mobile wallet, bank account / direct debit, or card, depending on availability)."} multiline /></li>
        <li><T k="legal.terms.9" d={"PB Mobiles never receives or stores your card number, bank login or wallet PIN."} multiline /></li>
        <li><T k="legal.terms.10" d={"If a payment is shown as pending, we will confirm the order once the gateway verifies it. Failed payments are not charged; if money is deducted in error it is reversed according to the gateway's and your bank's timelines."} multiline /></li>
      </ul>

      <h2 id="used"><T k="legal.terms.11" d={"4. Used devices"} multiline /></h2>
      <ul>
        <li><T k="legal.terms.12" d={"Used devices are inspected and graded (A+, A, B, C) by our lab. Grades describe cosmetic condition; all listed devices are functional unless stated."} multiline /></li>
        <li><T k="legal.terms.13" d={"Battery health is shown where the device reports it. Batteries are consumable and degrade with use."} multiline /></li>
        <li><T k="legal.terms.14" d={"Condition notes on each listing form part of the description of the device you buy."} multiline /></li>
      </ul>

      <h2 id="repairs"><T k="legal.terms.15" d={"5. Repairs"} multiline /></h2>
      <ul>
        <li><T k="legal.terms.16" d={"Every repair begins with a diagnosis. We will give you a quote and ask for approval before carrying out paid work."} multiline /></li>
        <li><T k="legal.terms.17" d={"Repair estimates may change if further faults are found; we will contact you for approval before continuing."} multiline /></li>
        <li><T k="legal.terms.18" d={"Devices with liquid damage, prior third-party repairs or board-level faults may carry a higher risk of further failure. We will explain any such risk before starting."} multiline /></li>
        <li><T k="legal.terms.19" d={"Devices not collected within 60 days of being marked \"Ready\" may incur a storage fee, after notice."} multiline /></li>
        <li><T k="legal.terms.20" d={"Your repair reference (PBR-…) and phone number are required to track or collect a repair."} multiline /></li>
      </ul>

      <h2 id="returns"><T k="legal.terms.21" d={"6. Returns & refunds"} multiline /></h2>
      <p>See our <a href="/returns" className="text-blue underline">Returns &amp; Warranty policy</a> for full details. In summary: unopened new accessories within 7 days; used devices within 7 days if they do not match their listed grade; faulty items are handled under warranty. Refunds are made to the original payment method once the return is finalised.</p>

      <h2 id="warranty"><T k="legal.terms.22" d={"7. Warranties"} multiline /></h2>
      <ul>
        <li><T k="legal.terms.23" d={"New phones carry the manufacturer's warranty where applicable."} multiline /></li>
        <li><T k="legal.terms.24" d={"Used phones carry a 30-day PB Lab hardware warranty unless otherwise stated."} multiline /></li>
        <li><T k="legal.terms.25" d={"Repairs carry a warranty on the replaced part and workmanship for the period stated on your invoice."} multiline /></li>
        <li><T k="legal.terms.26" d={"Warranties do not cover accidental damage, liquid damage, misuse, or repairs by third parties after our service."} multiline /></li>
      </ul>

      <h2 id="loyalty"><T k="legal.terms.27" d={"8. PB Rewards"} multiline /></h2>
      <ul>
        <li><T k="legal.terms.28" d={"Points are earned on eligible purchases and repairs, have no cash value, and expire as stated on the Loyalty page."} multiline /></li>
        <li><T k="legal.terms.29" d={"Points: 1 per Rs 100 spent on repairs and accessories; phones by price — Rs 10,000–29,999: 50, Rs 30,000–49,999: 100, Rs 50,000–79,999: 150, Rs 80,000+: 200 (installment phones on the same tiers). New members get 25 welcome points with their first purchase or repair, and 25 referral points for each friend who joins with their referral code and makes a first purchase or repair. Each award expires six months after it is earned; expired points cannot be redeemed."} multiline /></li>
        <li><T k="legal.terms.30" d={"Points can be redeemed in store: 50 points for a free screen protector, 100 points for a free custom 3D mobile skin, 200 points for free AirPods (subject to stock). Points can be accumulated until redeemed or expired; redeemed points cannot be restored; no points are earned on redeemed rewards; points from refunded or cancelled transactions are reversed; points are calculated on the eligible / net amount after discounts."} multiline /></li>
        <li><T k="legal.terms.31" d={"PB Mobiles may update rewards and rules; the current rules are always shown on the Loyalty page."} multiline /></li>
      </ul>

      <h2 id="responsibilities"><T k="legal.terms.32" d={"9. Customer responsibilities"} multiline /></h2>
      <ul>
        <li><T k="legal.terms.33" d={"Back up your data before handing in a device. We are not responsible for data loss during repair."} multiline /></li>
        <li><T k="legal.terms.34" d={"Remove SIM/memory cards and disable Find My / device locks where asked, or provide access so the device can be tested."} multiline /></li>
        <li><T k="legal.terms.35" d={"Provide accurate contact and delivery details, and inspect deliveries on arrival."} multiline /></li>
        <li><T k="legal.terms.36" d={"Ensure devices you bring for repair are legally yours or you are authorised to have them repaired."} multiline /></li>
      </ul>

      <h2 id="liability"><T k="legal.terms.37" d={"10. Liability"} multiline /></h2>
      <p><T k="legal.terms.38" d={"Nothing in these terms limits your rights under applicable Pakistani consumer protection law. Our total liability for any claim is limited to the amount you paid for the relevant product or service, except where the law does not allow such a limitation."} multiline /></p>

      <h2 id="contact"><T k="legal.terms.39" d={"11. Contact"} multiline /></h2>
      <p>{BRAND.full} · {BRAND.address} · {BRAND.phone} · {BRAND.email}</p>
    </LegalPage>
  );
}
