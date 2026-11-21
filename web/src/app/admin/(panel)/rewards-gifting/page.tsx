import { ExpensesScreen } from "@/components/admin/ExpensesScreen";

export const metadata = { title: "Rewards gifting" };

export default async function RewardsGiftingPage(props: PageProps<"/admin/rewards-gifting">) {
  const { month } = await props.searchParams;
  return <ExpensesScreen kind="GIFT" month={typeof month === "string" ? month : undefined} />;
}
