import Link from "next/link";
import { db } from "@/lib/db";
import { Field, PageTitle, Panel, Table, Td, dt } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { generateCardAction } from "../../_actions/cards";

export const metadata = { title: "Passport cards" };

/** PB Rewards card generator: first name, last name → unique Passport ID → printable card. */
export default async function CardsPage() {
  const recent = await db.customer.findMany({ orderBy: { createdAt: "desc" }, take: 25 });
  return (
    <>
      <PageTitle title="Passport card generator" sub="Issue a PB Rewards card with a unique Passport ID, then print it (bank-card size, front + back) or save it as a PDF." />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
        <Panel title="New card">
          <ActionForm action={generateCardAction} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name"><input name="firstName" required autoComplete="off" className="field" /></Field>
              <Field label="Last name"><input name="lastName" required autoComplete="off" className="field" /></Field>
            </div>
            <Field label="Mobile number" hint="Links the card to their points. If this number already has a card, that card opens instead."><input name="phone" type="tel" required placeholder="0300 1234567" className="field" /></Field>
            <Submit variant="gold">Generate card</Submit>
          </ActionForm>
        </Panel>
        <Panel title="Recent Passports">
          <Table head={["Customer", "Passport ID", "Points", "Since", ""]} empty="No customers yet.">
            {recent.map((c) => (
              <tr key={c.id}>
                <Td className="font-semibold">{c.name}<span className="block text-xs font-normal text-muted">{c.phone}</span></Td>
                <Td className="font-mono text-xs">{c.passportNo}</Td>
                <Td>{c.loyaltyPoints}</Td>
                <Td className="text-xs text-muted">{dt(c.createdAt)}</Td>
                <Td><Link href={`/admin/customers/${c.id}/card`} className="text-sm text-blue">Card →</Link></Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </>
  );
}
