import { ExpensesScreen } from "@/components/admin/ExpensesScreen";

export const metadata = { title: "Repair parts & tools expenses" };

export default async function RepairExpensesPage(props: PageProps<"/admin/repair-expenses">) {
  const { month } = await props.searchParams;
  return <ExpensesScreen kind="REPAIR" month={typeof month === "string" ? month : undefined} />;
}
