import { Reveal, SplitHeadline } from "../ui/Reveal";
import { cn } from "@/lib/format";

/** Editorial page header used on inner pages (large bold type, short copy — brief §11). */
export function PageHero({
  eyebrow,
  title,
  accent,
  intro,
  dark = false,
  children,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  intro?: string;
  dark?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section className={cn("relative overflow-hidden", dark ? "-mt-[var(--header-h)] bg-navy-950 pt-[var(--header-h)] text-white" : "")}>
      {dark && (
        <>
          <div aria-hidden className="absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-blue/20 blur-3xl" />
          <div aria-hidden className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-red/15 blur-3xl" />
        </>
      )}
      <div className="container-pb relative pb-12 pt-14 md:pb-16 md:pt-20">
        <Reveal immediate>
          <p className={cn("eyebrow", dark ? "text-gold" : "text-red")}>{eyebrow}</p>
        </Reveal>
        <h1 className="display mt-5 max-w-4xl text-5xl sm:text-6xl md:text-8xl">
          <SplitHeadline text={title} immediate />
          {accent && (
            <>
              {" "}
              <SplitHeadline text={accent} className={dark ? "text-gold" : "text-red"} delay={0.15} immediate />
            </>
          )}
        </h1>
        {intro && (
          <Reveal delay={0.15} immediate>
            <p className={cn("mt-6 max-w-2xl text-lg", dark ? "text-white/65" : "text-muted")}>{intro}</p>
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}
