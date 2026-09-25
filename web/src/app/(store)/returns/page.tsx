import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Returns & Warranty", description: "Returns, refunds and warranty information for new phones, used phones, accessories and repairs at PB Mobiles." };

const SECTIONS = [
  { id: "new", title: "New phones" },
  { id: "used", title: "Used phones" },
  { id: "accessories", title: "Accessories" },
  { id: "repairs", title: "Repairs" },
  { id: "how", title: "How to return" },
  { id: "refunds", title: "Refunds" },
];

export default function ReturnsPage() {
  return (
    <LegalPage title="Returns & Warranty" updated="September 2026" sections={SECTIONS}>
      <h2 id="new">New phones</h2>
      <p>Sealed, unopened phones may be returned within 7 days. Opened phones are covered by the manufacturer&apos;s warranty for faults; we will help you arrange warranty service.</p>
      <h2 id="used">Used phones</h2>
      <p>Return within 7 days if the device does not match its listed grade, battery health or notes. Hardware faults within 30 days are covered by the PB Lab warranty — we repair, replace or refund.</p>
      <h2 id="accessories">Accessories</h2>
      <p>Unopened accessories may be returned within 7 days. Manufacturing faults are replaced within 7 days of purchase. Fitted screen protectors cannot be returned once applied.</p>
      <h2 id="repairs">Repairs</h2>
      <p>Replaced parts and workmanship are covered for the warranty period on your repair invoice. The warranty does not cover new physical or liquid damage.</p>
      <h2 id="how">How to return</h2>
      <p>Bring the item, its accessories and your order number (PB-…) to the shop, or contact us to arrange a return. Staff record every finalised return — stock is restored and your refund is processed.</p>
      <h2 id="refunds">Refunds</h2>
      <p>Refunds are made to the original payment method after inspection. Gateway and bank processing times apply. Loyalty points earned on a refunded order are removed.</p>
    </LegalPage>
  );
}
