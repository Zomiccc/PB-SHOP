import Link from "next/link";

export function LegalPage({ title, updated, sections, children }: { title: string; updated: string; sections: { id: string; title: string }[]; children: React.ReactNode }) {
  return (
    <div className="container-pb grid gap-12 pb-24 pt-14 lg:grid-cols-[240px_1fr]">
      <aside className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:self-start">
        <p className="label">On this page</p>
        <nav className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-white hover:text-ink">{s.title}</a>
          ))}
        </nav>
        <div className="mt-6 flex flex-col gap-1 border-t border-ink/10 pt-4 text-sm">
          <Link href="/terms" className="text-blue hover:underline">Terms &amp; Conditions</Link>
          <Link href="/privacy" className="text-blue hover:underline">Privacy Policy</Link>
          <Link href="/returns" className="text-blue hover:underline">Returns &amp; Warranty</Link>
        </div>
      </aside>
      <article className="max-w-3xl">
        <p className="eyebrow text-red">Legal</p>
        <h1 className="display mt-4 text-5xl md:text-6xl">{title}</h1>
        <p className="mt-3 text-sm text-muted">Last updated {updated}</p>
        <p className="mt-6 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm text-[#6b4d0a]">
          Draft for review — this text is a starting template and must be reviewed and approved by PB Mobiles (and ideally a legal advisor) before launch.
        </p>
        <div className="prose-pb mt-4">{children}</div>
      </article>
    </div>
  );
}
