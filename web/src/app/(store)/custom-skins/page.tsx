import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/PageHero";
import { T } from "@/components/site/Editable";
import { BrandModelPicker } from "@/components/skins/BrandModelPicker";
import { OwnDesignUpload } from "@/components/skins/OwnDesignUpload";
import { Icon } from "@/components/ui/Icon";
import { skinCatalogue } from "@/lib/skins";
import { getSetting } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Custom Skins — Phone Back Skins",
  description: "Pick your phone brand and model, try our skin designs on your exact phone, choose the finish and camera cover. Fitted in store at PB Mobiles.",
};
export const dynamic = "force-dynamic";

/** Custom Skins (v4 §9): search the brand → pick the model → the model's skin page. */
export default async function CustomSkinsPage() {
  const [brands, cfg] = await Promise.all([skinCatalogue(), getSetting("customSkins")]);

  return (
    <>
      <PageHero k="page.customSkins" eyebrow="Custom Skins" title="Your phone," accent="your style." intro="Find your phone and try our designs on your exact model — or upload your own picture to see it on any phone. Precision-cut and fitted in store." />
      <section className="pb-16">
        <div className="container-pb">
          {cfg.enabled && brands.length ? (
            <>
              {/* v6 §4: customers can preview their own picture on any model (it stays on their device). */}
              <div className="mx-auto mb-4 max-w-2xl"><OwnDesignUpload /></div>
              <BrandModelPicker brands={brands} />
            </>
          ) : (
            <p className="card mx-auto max-w-2xl p-8 text-center text-muted"><T k="page.customSkins.empty" d="Custom skins are coming soon. Ask us in store or on chat." /></p>
          )}
          <ol className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-3">
            {[
              { icon: "search", t: "Find your phone", d: "Search your brand, then choose the exact model." },
              { icon: "sparkle", t: "Try the designs", d: "See each skin on your phone's real shape, with or without the camera covered." },
              { icon: "wrench", t: "Fitted in store", d: "Cut for your model and applied by our lab — bubble-free." },
            ].map((s, i) => (
              <li key={s.t} className="rounded-2xl bg-card p-5 ring-1 ring-white/8">
                <span className="font-mono text-xs text-gold">0{i + 1}</span>
                <Icon name={s.icon} className="mt-3 h-5 w-5 text-gold" />
                <p className="mt-2 font-semibold"><T k={`page.customSkins.step${i + 1}`} d={s.t} /></p>
                <p className="mt-1 text-sm text-muted"><T k={`page.customSkins.step${i + 1}.text`} d={s.d} multiline /></p>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-center text-sm text-muted">
            <T k="page.customSkins.notListed" d="Phone not listed?" /> <Link href="/contact?subject=Custom%20skin%20request" className="text-gold hover:underline"><T k="page.customSkins.notListed.link" d="Tell us your model" /></Link>.
          </p>
        </div>
      </section>
    </>
  );
}
