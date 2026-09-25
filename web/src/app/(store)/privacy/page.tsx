import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";
import { BRAND } from "@/lib/constants";

export const metadata: Metadata = { title: "Privacy Policy", description: "How PB Mobiles collects, uses and protects your personal information." };

const SECTIONS = [
  { id: "collect", title: "What we collect" },
  { id: "use", title: "How we use it" },
  { id: "payments", title: "Payments" },
  { id: "sharing", title: "Sharing" },
  { id: "social", title: "Purchase notifications" },
  { id: "retention", title: "Retention & security" },
  { id: "rights", title: "Your choices" },
];

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="September 2026" sections={SECTIONS}>
      <h2 id="collect">What we collect</h2>
      <ul>
        <li>Contact details you give us: name, mobile number, email and delivery address.</li>
        <li>Order, repair, loyalty and Care Card history linked to your PB Phone Passport.</li>
        <li>Repair photos you choose to upload, and messages sent through chat or the contact form.</li>
        <li>Basic technical data (browser, pages visited) to keep the site secure and working.</li>
      </ul>
      <h2 id="use">How we use it</h2>
      <p>To process orders and repairs, contact you about them, run the loyalty programme, provide customer support, prevent fraud and meet legal obligations. We only send marketing if you opt in.</p>
      <h2 id="payments">Payments</h2>
      <p>Payments are handled by our payment gateway. We receive only a transaction reference and status — never your card, bank or wallet credentials.</p>
      <h2 id="sharing">Sharing</h2>
      <p>We share data only with service providers needed to run the business (payment gateway, delivery partner, hosting, SMS/WhatsApp messaging) or when required by law. We do not sell personal data.</p>
      <h2 id="social">Purchase notifications</h2>
      <p>Our site may show short notices such as &quot;Ali K. from Lahore purchased iPhone 13&quot;. These come only from genuine orders and use a first name and initial (or a generic label) — never your full name, number or address.</p>
      <h2 id="retention">Retention &amp; security</h2>
      <p>We keep records for as long as needed for warranty, accounting and legal purposes. Data is stored on secured servers with access limited to authorised staff, and sensitive staff actions are logged.</p>
      <h2 id="rights">Your choices</h2>
      <p>You can ask us to update or delete your details (subject to records we must keep by law) by contacting {BRAND.email} or {BRAND.phone}.</p>
    </LegalPage>
  );
}
