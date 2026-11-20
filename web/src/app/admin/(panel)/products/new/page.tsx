import { redirect } from "next/navigation";

/** "Add product" opens the three short forms (Accessories, New phone, Used phone) — Nov 2026. */
export default function NewProductPage() {
  redirect("/admin/inventory/new");
}
