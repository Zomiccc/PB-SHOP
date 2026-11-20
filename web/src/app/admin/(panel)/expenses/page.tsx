import { ExpensesScreen } from "@/components/admin/ExpensesScreen";

export const metadata = { title: "Daily expenses" };

export default async function DailyExpensesPage(props: PageProps<"/admin/expenses">) {
  const { month } = await props.searchParams;
  return <ExpensesScreen kind="DAILY" month={typeof month === "string" ? month : undefined} />;
}
