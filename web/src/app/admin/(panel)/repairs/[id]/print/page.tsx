/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/staff";
import { parseJson, pkr } from "@/lib/format";
import { BRAND, DROP_OFF, REPAIR_CATEGORIES, REPAIR_STATUSES } from "@/lib/constants";
import { PrintButton } from "@/components/admin/PrintButton";

export const metadata = { title: "Print repair" };

const when = (d: Date | null | undefined) => (d ? d.toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" }) : "—");

/**
 * Printable repair information (master brief §13): A4, black-and-white friendly, no site chrome.
 * Only the .print-area is printed (see globals.css); navigation, chat and buttons are excluded.
 */
export default async function RepairPrintPage(props: PageProps<"/admin/repairs/[id]/print">) {
  const staff = await requireStaffPage();
  const { id } = await props.params;
  const r = await db.repairRequest.findUnique({
    where: { id },
    include: {
      assignedTo: true,
      notes: { where: { kind: "REPAIR" }, orderBy: { createdAt: "asc" }, include: { author: true } },
      statusChanges: { orderBy: { createdAt: "asc" }, include: { staff: true } },
      careRedemptions: { include: { service: true, careCard: true } },
    },
  });
  if (!r) notFound();

  // Latest value of each structured note field (reported issue, findings, work done, parts used).
  const meta: Record<string, string> = {};
  for (const n of r.notes) Object.assign(meta, parseJson<Record<string, string>>(n.meta, {}));
  const status = REPAIR_STATUSES.find((s) => s.key === r.status)?.label ?? r.status;
  const lastStaff = [...r.statusChanges].reverse().find((s) => s.staff)?.staff?.name;

  return (
    <div className="print-a4 py-4">
      <style>{`@page { size: A4; margin: 14mm; } @media print { .print-a4 { padding: 0 !important; } }`}</style>
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-muted">Preview — only the white document below is printed.</p>
        <PrintButton label="Print repair information" />
      </div>

      <article className="print-area mx-auto w-full max-w-[210mm] bg-white p-8 text-[11pt] leading-snug text-black shadow-lg print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-black pb-4">
          <div className="flex items-center gap-4">
            <img src="/brand/pb-logo.webp" alt="PB Mobiles & Repairing Lab" className="h-16 w-auto" />
            <div className="text-[9pt]">
              <p className="font-bold">{BRAND.full}</p>
              <p>{BRAND.address}</p>
              <p>{BRAND.phone} · {BRAND.email}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9pt] uppercase tracking-widest">Repair information</p>
            <p className="text-[20pt] font-bold leading-none">{r.ref}</p>
            <p className="mt-1 text-[9pt]">Status: <b>{status}</b></p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-6">
          <Block title="Customer">
            <Row k="Name" v={r.name} />
            <Row k="Phone" v={r.phone} />
            {r.email && <Row k="Email" v={r.email} />}
          </Block>
          <Block title="Device">
            <Row k="Brand / model" v={`${r.brand} ${r.model}`} />
            <Row k="IMEI / serial" v={r.imei || "Not recorded"} />
            <Row k="Repair type" v={REPAIR_CATEGORIES[r.category as keyof typeof REPAIR_CATEGORIES] ?? r.category} />
          </Block>
        </section>

        <Block title="Reported problem" className="mt-5">
          {meta.issue && <p className="mb-1 font-semibold">{meta.issue}</p>}
          <p className="whitespace-pre-line">{r.description}</p>
        </Block>

        <section className="mt-5 grid grid-cols-2 gap-6">
          <Block title="Diagnosis / inspection findings"><p className="whitespace-pre-line">{meta.findings || "—"}</p></Block>
          <Block title="Parts used"><p className="whitespace-pre-line">{meta.parts || "—"}</p></Block>
        </section>
        <Block title="Work completed" className="mt-5"><p className="whitespace-pre-line">{meta.work || "—"}</p></Block>

        <section className="mt-5 grid grid-cols-3 gap-6">
          <Block title="Charges">
            <Row k="Quote" v={r.quote != null ? pkr(r.quote) : "—"} />
            <Row k="Final charge" v={r.finalPrice != null ? pkr(r.finalPrice) : "—"} strong />
          </Block>
          <Block title="Staff">
            <Row k="Technician" v={r.assignedTo?.name ?? "—"} />
            <Row k="Last update by" v={lastStaff ?? "—"} />
            <Row k="Printed by" v={staff.name} />
          </Block>
          <Block title="Dates">
            <Row k="Booked" v={when(r.createdAt)} />
            <Row k="Drop-off" v={r.preferredAt ? when(r.preferredAt) : DROP_OFF[r.dropOff as keyof typeof DROP_OFF] ?? r.dropOff} />
            <Row k="Completed" v={when(r.completedAt)} />
          </Block>
        </section>

        {r.careRedemptions.length > 0 && (
          <Block title="Care Card services used" className="mt-5">
            {r.careRedemptions.map((c) => <p key={c.id}>{c.careCard.number} — {c.service.name}</p>)}
          </Block>
        )}

        <Block title="Staff notes" className="mt-5">
          {r.notes.length === 0 ? (
            <p>—</p>
          ) : (
            <table className="w-full border-collapse text-[9.5pt]">
              <tbody>
                {r.notes.map((n) => (
                  <tr key={n.id} className="border-b border-black/30 align-top">
                    <td className="w-[34mm] py-1 pr-2">{when(n.createdAt)}</td>
                    <td className="w-[30mm] py-1 pr-2 font-semibold">{n.author.name}</td>
                    <td className="py-1 whitespace-pre-line">{n.important ? "★ " : ""}{n.body}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Block>

        <Block title="Status history" className="mt-5">
          <p className="text-[9.5pt]">
            {r.statusChanges.map((s, i) => (
              <span key={s.id}>
                {i > 0 && " → "}
                {REPAIR_STATUSES.find((x) => x.key === s.to)?.label ?? s.to} ({when(s.createdAt)}{s.staff ? `, ${s.staff.name}` : ""})
              </span>
            ))}
          </p>
        </Block>

        <footer className="mt-10 grid grid-cols-2 gap-10 text-[9pt]">
          <div><div className="h-10 border-b border-black" /><p className="mt-1">Customer signature</p></div>
          <div><div className="h-10 border-b border-black" /><p className="mt-1">Technician signature</p></div>
        </footer>
        <p className="mt-6 text-center text-[8pt]">Please keep this document. Bring your repair reference ({r.ref}) and ID when collecting. Terms: pbmobiles.pk/terms</p>
      </article>
    </div>
  );
}

function Block({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h2 className="mb-1.5 border-b border-black pb-0.5 text-[9pt] font-bold uppercase tracking-wider">{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <p className="flex justify-between gap-3">
      <span>{k}</span>
      <span className={strong ? "font-bold" : ""}>{v}</span>
    </p>
  );
}
