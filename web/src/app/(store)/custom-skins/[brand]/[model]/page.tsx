import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SkinConfigurator } from "@/components/skins/SkinConfigurator";
import { Icon } from "@/components/ui/Icon";
import { skinModelPage, toTemplate } from "@/lib/skins";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/custom-skins/[brand]/[model]">): Promise<Metadata> {
  const { brand, model } = await props.params;
  const page = await skinModelPage(brand, model);
  if (!page) return { title: "Custom Skins" };
  const title = `${page.brand.name} ${page.model.name}`;
  return { title: `${title} Skins`, description: `Custom skins for the ${title}: 3D, leather, transparent printed, your own photo and jelly — try every design on your phone. Fitted at PB Mobiles.` };
}

/** Selected-model Custom Skins page (v4 §9 step 4 — product-style layout from the client's reference). */
export default async function SkinModelPage(props: PageProps<"/custom-skins/[brand]/[model]">) {
  const { brand, model } = await props.params;
  const [page, cfg] = await Promise.all([skinModelPage(brand, model), getSetting("customSkins")]);
  if (!page || !cfg.enabled) notFound();
  const title = `${page.brand.name} ${page.model.name}`;

  return (
    <div className="container-pb pb-20 pt-6">
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted">
        <Link href="/" className="hover:text-white">Home</Link>
        <Icon name="arrow-right" className="h-3 w-3" />
        <Link href="/custom-skins" className="hover:text-white">Custom Skins</Link>
        <Icon name="arrow-right" className="h-3 w-3" />
        <span className="text-white">{title} skins</span>
      </nav>
      <SkinConfigurator
        title={title}
        template={toTemplate(page.model)}
        designs={page.skins.map((s) => ({ id: s.id, name: s.name, description: s.description, imageUrl: s.imageUrl, focus: s.focus, price: s.price }))}
        types={page.types.map((t) => ({ id: t.id, name: t.name, description: t.description, price: t.price, look: t.look, designMode: t.designMode }))}
        cameraCoverPrice={cfg.cameraCoverPrice}
      />
      <p className="mt-10 text-sm text-muted">
        Different phone? <Link href="/custom-skins" className="text-gold hover:underline">Choose another model</Link>
      </p>
    </div>
  );
}
