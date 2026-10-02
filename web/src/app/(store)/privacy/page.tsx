import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";
import { BRAND } from "@/lib/constants";
import { ID_POINTS } from "@/components/IdPrivacyNotice";

export const metadata: Metadata = { title: "Privacy Policy", description: "How PB Mobiles collects, uses and protects your personal information." };

const SECTIONS = [
  { id: "collect", title: "What we collect" },
  { id: "use", title: "How we use it" },
  { id: "id-documents", title: "CNIC / ID documents" },
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
        <li>Order, repair and PB Points history linked to your PB Rewards account.</li>
        <li>Repair photos and documents you choose to upload, and messages, files and voice notes sent through chat or the contact form.</li>
        <li>For installment purchases or when you sell us a used phone: a copy of your CNIC (see below).</li>
        <li>Basic technical data (browser, pages visited) to keep the site secure and working.</li>
      </ul>
      <h2 id="use">How we use it</h2>
      <p>To process orders and repairs, contact you about them, run the loyalty programme, provide customer support, prevent fraud and meet legal obligations. We only send marketing if you opt in.</p>
      <h2 id="id-documents">CNIC / ID documents — security &amp; privacy</h2>
      <p>For installment purchases, and when you sell us a used phone, we take a copy of your CNIC (front and back). Here is exactly how we treat it:</p>
      <ul>
        {ID_POINTS.map((p) => (
          <li key={p.t}><b>{p.t}:</b> {p.d}</li>
        ))}
      </ul>
      <p>Before we take your ID, staff show you this notice and ask for your agreement. We handle personal data in line with Pakistan&apos;s applicable data-protection and cyber-crime laws, including the Prevention of Electronic Crimes Act 2016.</p>
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
