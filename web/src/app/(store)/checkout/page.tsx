import type { Metadata } from "next";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { getSetting } from "@/lib/settings";
import { getCurrentCustomer } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const [shipping, passport, customer] = await Promise.all([getSetting("shipping"), getSetting("passport"), getCurrentCustomer()]);
  // An account is required to check out (client request): sign up / log in, then come straight back here.
  if (!customer) redirect("/account?next=%2Fcheckout&tab=register");
  return (
    <>
      <div className="container-pb pb-8 pt-12">
        <p className="eyebrow text-red">Secure checkout</p>
        <h1 className="display mt-4 text-5xl md:text-6xl">Almost yours.</h1>
      </div>
      <CheckoutForm
        shipping={shipping}
        pointsRules={{ rupeesPerPoint: passport.rupeesPerPoint, phoneTiers: passport.phoneTiers }}
        defaults={{ name: customer?.name, phone: customer?.phone, email: customer?.email ?? undefined }}
      />
    </>
  );
}
