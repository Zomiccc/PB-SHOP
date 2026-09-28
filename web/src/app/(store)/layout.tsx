import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StoreProviders } from "@/components/layout/StoreProviders";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Chatbox } from "@/components/chat/Chatbox";
import { SocialProof } from "@/components/SocialProof";
import { BroadcastBar } from "@/components/layout/BroadcastBar";
import { activeBroadcast, safeHref } from "@/lib/broadcasts";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const b = await activeBroadcast().catch(() => null);
  const broadcast = b ? { ...b, ctaHref: safeHref(b.ctaHref) } : null;
  return (
    <StoreProviders>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-gold focus:px-4 focus:text-[#120d02] focus:py-2">
        Skip to content
      </a>
      <BroadcastBar broadcast={broadcast} />
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <CartDrawer />
      <SocialProof />
      <Chatbox />
    </StoreProviders>
  );
}
