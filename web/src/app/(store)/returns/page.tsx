import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";
import { T } from "@/components/site/Editable";

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
      <h2 id="new"><T k="legal.returns.1" d={"New phones"} multiline /></h2>
      <p><T k="legal.returns.2" d={"Sealed, unopened phones may be returned within 7 days. Opened phones are covered by the manufacturer's warranty for faults; we will help you arrange warranty service."} multiline /></p>
      <h2 id="used"><T k="legal.returns.3" d={"Used phones"} multiline /></h2>
      <p><T k="legal.returns.4" d={"Return within 7 days if the device does not match its listed grade, battery health or notes. Hardware faults within 30 days are covered by the PB Lab warranty — we repair, replace or refund."} multiline /></p>
      <h2 id="accessories"><T k="legal.returns.5" d={"Accessories"} multiline /></h2>
      <p><T k="legal.returns.6" d={"Unopened accessories may be returned within 7 days. Manufacturing faults are replaced within 7 days of purchase. Fitted screen protectors cannot be returned once applied."} multiline /></p>
      <h2 id="repairs"><T k="legal.returns.7" d={"Repairs"} multiline /></h2>
      <p><T k="legal.returns.8" d={"Replaced parts and workmanship are covered for the warranty period on your repair invoice. The warranty does not cover new physical or liquid damage."} multiline /></p>
      <h2 id="how"><T k="legal.returns.9" d={"How to return"} multiline /></h2>
      <p><T k="legal.returns.10" d={"Bring the item, its accessories and your order number (PB-…) to the shop, or contact us to arrange a return. Staff record every finalised return — stock is restored and your refund is processed."} multiline /></p>
      <h2 id="refunds"><T k="legal.returns.11" d={"Refunds"} multiline /></h2>
      <p><T k="legal.returns.12" d={"Refunds are made to the original payment method after inspection. Gateway and bank processing times apply. Loyalty points earned on a refunded order are removed."} multiline /></p>
    </LegalPage>
  );
}
