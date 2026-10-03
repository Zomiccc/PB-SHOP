import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";
import { BRAND } from "@/lib/constants";
import { ID_POINTS } from "@/components/IdPrivacyNotice";
import { T } from "@/components/site/Editable";

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
      <h2 id="collect"><T k="legal.privacy.1" d={"What we collect"} multiline /></h2>
      <ul>
        <li><T k="legal.privacy.2" d={"Contact details you give us: name, mobile number, email and delivery address."} multiline /></li>
        <li><T k="legal.privacy.3" d={"Order, repair and PB Points history linked to your PB Rewards account."} multiline /></li>
        <li><T k="legal.privacy.4" d={"Repair photos and documents you choose to upload, and messages, files and voice notes sent through chat or the contact form."} multiline /></li>
        <li><T k="legal.privacy.5" d={"For installment purchases or when you sell us a used phone: a copy of your CNIC (see below)."} multiline /></li>
        <li><T k="legal.privacy.6" d={"Basic technical data (browser, pages visited) to keep the site secure and working."} multiline /></li>
      </ul>
      <h2 id="use"><T k="legal.privacy.7" d={"How we use it"} multiline /></h2>
      <p><T k="legal.privacy.8" d={"To process orders and repairs, contact you about them, run the loyalty programme, provide customer support, prevent fraud and meet legal obligations. We only send marketing if you opt in."} multiline /></p>
      <h2 id="id-documents"><T k="legal.privacy.9" d={"CNIC / ID documents — security & privacy"} multiline /></h2>
      <p><T k="legal.privacy.10" d={"For installment purchases, and when you sell us a used phone, we take a copy of your CNIC (front and back). Here is exactly how we treat it:"} multiline /></p>
      <ul>
        {ID_POINTS.map((p) => (
          <li key={p.t}><b>{p.t}:</b> {p.d}</li>
        ))}
      </ul>
      <p><T k="legal.privacy.11" d={"Before we take your ID, staff show you this notice and ask for your agreement. We handle personal data in line with Pakistan's applicable data-protection and cyber-crime laws, including the Prevention of Electronic Crimes Act 2016."} multiline /></p>
      <h2 id="payments"><T k="legal.privacy.12" d={"Payments"} multiline /></h2>
      <p><T k="legal.privacy.13" d={"Payments are handled by our payment gateway. We receive only a transaction reference and status — never your card, bank or wallet credentials."} multiline /></p>
      <h2 id="sharing"><T k="legal.privacy.14" d={"Sharing"} multiline /></h2>
      <p><T k="legal.privacy.15" d={"We share data only with service providers needed to run the business (payment gateway, delivery partner, hosting, SMS/WhatsApp messaging) or when required by law. We do not sell personal data."} multiline /></p>
      <h2 id="social"><T k="legal.privacy.16" d={"Purchase notifications"} multiline /></h2>
      <p><T k="legal.privacy.17" d={"Our site may show short notices such as \"Ali K. from Lahore purchased iPhone 13\". These come only from genuine orders and use a first name and initial (or a generic label) — never your full name, number or address."} multiline /></p>
      <h2 id="retention"><T k="legal.privacy.18" d={"Retention & security"} multiline /></h2>
      <p><T k="legal.privacy.19" d={"We keep records for as long as needed for warranty, accounting and legal purposes. Data is stored on secured servers with access limited to authorised staff, and sensitive staff actions are logged."} multiline /></p>
      <h2 id="rights"><T k="legal.privacy.20" d={"Your choices"} multiline /></h2>
      <p>You can ask us to update or delete your details (subject to records we must keep by law) by contacting {BRAND.email} or {BRAND.phone}.</p>
    </LegalPage>
  );
}
