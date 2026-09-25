import type { Metadata } from "next";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { getSetting } from "@/lib/settings";
import { getCurrentCustomer } from "@/lib/auth";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const [shipping, loyalty, customer] = await Promise.all([getSetting("shipping"), getSetting("loyalty"), getCurrentCustomer()]);
  return (
    <>
      <div className="container-pb pb-8 pt-12">
        <p className="eyebrow text-red">Secure checkout</p>
        <h1 className="display mt-4 text-5xl md:text-6xl">Almost yours.</h1>
      </div>
      <CheckoutForm
        shipping={shipping}
        pointsPerRupees={loyalty.pointsPerRupees}
        defaults={{ name: customer?.name, phone: customer?.phone, email: customer?.email ?? undefined }}
      />
    </>
  );
}
