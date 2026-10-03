"use client";

import { Reveal, SplitHeadline } from "../ui/Reveal";
import { T, Zone, useEditing, useText } from "../site/Editable";
import { cn } from "@/lib/format";

/**
 * Editorial page header used on inner pages (large bold type, short copy — brief §11). Every line is editable
 * in the website editor under `k` (e.g. "page.repair.title"), and the owner can add sections just below it.
 */
export function PageHero({
  k,
  eyebrow,
  title,
  accent,
  intro,
  dark = false,
  children,
}: {
  k: string;
  eyebrow: string;
  title: string;
  accent?: string;
  intro?: string;
  dark?: boolean;
  children?: React.ReactNode;
}) {
  const editing = useEditing();
  const t = {
    title: useText(`${k}.title`, title),
    accent: useText(`${k}.accent`, accent ?? ""),
    intro: useText(`${k}.intro`, intro ?? ""),
  };
  return (
    <>
      <section className={cn("relative overflow-hidden", dark ? "-mt-[var(--header-h)] bg-navy-950 pt-[var(--header-h)] text-white" : "")}>
        {dark && (
          <>
            <div aria-hidden className="absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-blue/20 blur-3xl" />
            <div aria-hidden className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-red/15 blur-3xl" />
          </>
        )}
        <div className="container-pb relative pb-12 pt-14 md:pb-16 md:pt-20">
          <Reveal immediate>
            <p className={cn("eyebrow", dark ? "text-gold" : "text-red")}>
              <T k={`${k}.eyebrow`} d={eyebrow} />
            </p>
          </Reveal>
          <h1 className="display mt-5 max-w-4xl text-5xl sm:text-6xl md:text-8xl">
            {editing ? (
              <>
                <T k={`${k}.title`} d={title} />{" "}
                <span className={dark ? "text-gold" : "text-red"}>
                  <T k={`${k}.accent`} d={accent ?? ""} />
                </span>
              </>
            ) : (
              <>
                <SplitHeadline text={t.title} immediate />
                {t.accent && (
                  <>
                    {" "}
                    <SplitHeadline text={t.accent} className={dark ? "text-gold" : "text-red"} delay={0.15} immediate />
                  </>
                )}
              </>
            )}
          </h1>
          {(t.intro || editing) && (
            <Reveal delay={0.15} immediate>
              <p className={cn("mt-6 max-w-2xl text-lg", dark ? "text-white/65" : "text-muted")}>
                <T k={`${k}.intro`} d={intro ?? ""} multiline />
              </p>
            </Reveal>
          )}
          {children}
        </div>
      </section>
      <Zone k={`${k}.top`} />
    </>
  );
}
