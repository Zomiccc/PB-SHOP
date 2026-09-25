import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StoreProviders } from "@/components/layout/StoreProviders";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Chatbox } from "@/components/chat/Chatbox";
import { SocialProof } from "@/components/SocialProof";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProviders>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <CartDrawer />
      <SocialProof />
      <Chatbox />
    </StoreProviders>
  );
}
