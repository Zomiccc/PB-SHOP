import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StoreProviders } from "@/components/layout/StoreProviders";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Chatbox } from "@/components/chat/Chatbox";
import { SocialProof } from "@/components/SocialProof";
import { NotificationsBar } from "@/components/layout/NotificationsBar";
import { SiteContentProvider, Zone } from "@/components/site/Editable";
import { getPublishedContent } from "@/lib/site-content";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  // Owner edits from the website editor (Admin → Edit website); built-in text everywhere else.
  const content = await getPublishedContent();
  return (
    <SiteContentProvider published={content}>
      <StoreProviders>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-gold focus:px-4 focus:text-[#120d02] focus:py-2">
          Skip to content
        </a>
        {/* Top of the homepage: "Enable Notifications" (v6 §9). Broadcasts now sit beneath Shop Phones (v6 §1). */}
        <NotificationsBar />
        <Header />
        <main id="main">
          {children}
          {/* Owner-added sections shown on every page, just above the footer */}
          <Zone k="site.beforeFooter" />
        </main>
        <Footer />
        <CartDrawer />
        <SocialProof />
        <Chatbox />
      </StoreProviders>
    </SiteContentProvider>
  );
}
