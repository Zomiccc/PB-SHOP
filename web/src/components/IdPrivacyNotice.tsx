import Link from "next/link";
import { BRAND } from "@/lib/constants";
import { Icon } from "./ui/Icon";

/**
 * Security & privacy notice for CNIC / ID documents — shown to customers on the website and to staff
 * (read to the customer) before an ID is taken for an installment purchase or a used-phone sale.
 * DRAFT wording: have it approved by PB Mobiles' legal adviser before launch.
 */
export const ID_POINTS = [
  { t: "Why we ask", d: "Only to verify your identity for an installment purchase or when you sell us a used phone — this protects you and helps stop the trade in stolen phones." },
  { t: "What we take", d: "Photos of the front and back of your CNIC, your name, CNIC number and mobile number, and any extra documents you choose to give us." },
  { t: "How it's protected", d: "Stored privately and encrypted in transit; never published or shown on the website. Only authorised PB Mobiles staff can open it, and every time someone does, it is recorded." },
  { t: "Never misused", d: "We never sell your data or use your ID for marketing. It is shared only with our financing partner to approve an installment plan, or when the law requires (e.g. a lawful request from the police or PTA)." },
  { t: "How long we keep it", d: "Only as long as needed for the purchase and our legal record-keeping, then it is deleted." },
  { t: "Your rights", d: `You can ask what we hold, ask us to correct it, or ask us to delete it once the law no longer requires us to keep it — contact ${BRAND.phone} or ${BRAND.email}.` },
];

export const ID_CONSENT_TEXT =
  "I have read the ID privacy notice. I agree that PB Mobiles may keep a copy of my CNIC for this purchase only, and PB Mobiles agrees to protect it and use it in line with Pakistan's applicable data-protection and cyber-crime laws (including PECA 2016).";

export function IdPrivacyNotice({ tone = "dark", compact = false }: { tone?: "dark" | "panel"; compact?: boolean }) {
  return (
    <section id="id-documents" aria-labelledby="id-privacy-title" className={`scroll-mt-28 rounded-[1.5rem] p-5 ring-1 md:p-7 ${tone === "dark" ? "bg-[#07090d] text-white ring-gold/30" : "bg-cream ring-ink/10"}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/15 text-gold ring-1 ring-gold/40"><Icon name="shield" className="h-5 w-5" /></span>
        <div>
          <h2 id="id-privacy-title" className="text-lg font-semibold">Your ID is safe with us</h2>
          <p className={`text-xs ${tone === "dark" ? "text-white/55" : "text-muted"}`}>Security & privacy notice for CNIC / ID documents</p>
        </div>
      </div>
      <dl className={`mt-5 grid gap-4 text-sm ${compact ? "" : "sm:grid-cols-2"}`}>
        {(compact ? ID_POINTS.slice(0, 4) : ID_POINTS).map((p) => (
          <div key={p.t}>
            <dt className="font-semibold text-gold-soft">{p.t}</dt>
            <dd className={`mt-1 leading-relaxed ${tone === "dark" ? "text-white/75" : "text-muted"}`}>{p.d}</dd>
          </div>
        ))}
      </dl>
      <p className={`mt-5 border-t pt-4 text-xs leading-relaxed ${tone === "dark" ? "border-white/10 text-white/55" : "border-ink/10 text-muted"}`}>
        We handle personal data in line with Pakistan&apos;s applicable data-protection and cyber-crime laws, including the Prevention of Electronic Crimes Act 2016.{" "}
        {compact && <Link href="/privacy#id-documents" className="text-gold underline underline-offset-2">Read the full notice</Link>}
      </p>
    </section>
  );
}
