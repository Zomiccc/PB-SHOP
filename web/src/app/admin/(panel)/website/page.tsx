import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/staff";
import { isReset } from "@/lib/site-content-types";
import { Badge, PageTitle, Panel, dt } from "@/components/admin/Primitives";
import { ActionForm, Submit } from "@/components/admin/ui";
import { discardWebsiteAction, publishWebsiteAction, resetWebsiteItemAction } from "../../_actions/website";

export const metadata = { title: "Edit website" };
export const dynamic = "force-dynamic";

const PAGES = [
  { href: "/", label: "Home" },
  { href: "/repair", label: "Repairs" },
  { href: "/installments", label: "Installments" },
  { href: "/custom-skins", label: "Custom skins" },
  { href: "/loyalty", label: "PB Rewards" },
  { href: "/new-phones", label: "New phones" },
  { href: "/used-phones", label: "Used phones" },
  { href: "/tablets", label: "Tablets" },
  { href: "/accessories", label: "Accessories" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/returns", label: "Returns" },
];

const editLink = (href: string) => `/api/admin/site-content/edit?on=1&next=${encodeURIComponent(href)}`;

/** A short, readable preview of a stored value. */
function preview(kind: string, json: string | null) {
  if (json == null) return "—";
  try {
    const v = JSON.parse(json);
    if (isReset(v)) return "↺ back to the original";
    if (kind === "TEXT") return String(v) === "" ? "(hidden)" : String(v);
    if (kind === "MEDIA") return v.kind === "YOUTUBE" ? `YouTube video ${v.url}` : `${v.kind === "VIDEO" ? "Video" : "Picture"}${v.alt ? ` — ${v.alt}` : ""}`;
    if (kind === "ZONE") return `${v.length} added section${v.length === 1 ? "" : "s"}`;
  } catch {}
  return "—";
}

const resetPending = (draft: string | null) => {
  try {
    return draft != null && isReset(JSON.parse(draft));
  } catch {
    return false;
  }
};

/** Owner only: open the live site in edit mode, then publish (or discard) the changes. */
export default async function WebsitePage() {
  await requireStaffPage({ superAdmin: true });
  const rows = await db.siteContent.findMany({ orderBy: { updatedAt: "desc" } });
  const drafts = rows.filter((r) => r.draft != null);
  const live = rows.filter((r) => r.published != null);

  return (
    <>
      <PageTitle title="Edit website" sub="Change any text, picture or video on the site yourself, add your own sections, then press Publish — no developer or hosting needed." />

      <Panel title="1. Edit the website" className="mb-6">
        <ol className="mb-5 list-decimal space-y-1.5 pl-5 text-sm text-muted">
          <li>Open a page below. Every editable text gets a gold dotted outline — click it and type. Press Enter (or click away) to save it as a draft.</li>
          <li>Pictures and videos show a <b className="text-ink">Replace</b> button: upload from your phone or computer, or paste a YouTube link.</li>
          <li><b className="text-ink">Add a section here</b> boxes let you add your own picture, video, text, or picture + text + button (every page has one under its heading and one above the footer).</li>
          <li>Visitors don&apos;t see anything until you press <b className="text-ink">Publish</b> — in the bar at the bottom of the site, or here.</li>
        </ol>
        <div className="flex flex-wrap gap-2">
          {PAGES.map((p) => (
            <a key={p.href} href={editLink(p.href)} className={p.href === "/" ? "btn btn-gold !py-2.5 !text-sm" : "btn btn-ghost !py-2 !text-sm"}>
              <span>{p.href === "/" ? "Edit the homepage" : p.label}</span>
            </a>
          ))}
        </div>
      </Panel>

      <Panel
        title={`2. Unpublished changes (${drafts.length})`}
        className="mb-6"
        action={
          drafts.length > 0 && (
            <div className="flex gap-2">
              <ActionForm action={discardWebsiteAction} confirm="Throw away ALL unpublished changes?">
                <Submit variant="ghost">Discard all</Submit>
              </ActionForm>
              <ActionForm action={publishWebsiteAction}>
                <Submit variant="gold">Publish now</Submit>
              </ActionForm>
            </div>
          )
        }
      >
        {drafts.length === 0 ? (
          <p className="text-sm text-muted">Nothing waiting. Changes you make on the site appear here until you publish them.</p>
        ) : (
          <ul className="divide-y divide-ink/10">
            {drafts.map((r) => (
              <li key={r.key} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs text-muted">{r.key}</p>
                  <p className="mt-0.5 line-clamp-2 whitespace-pre-line">{preview(r.kind, r.draft)}</p>
                  {r.published != null && <p className="mt-0.5 line-clamp-1 text-xs text-muted">Live now: {preview(r.kind, r.published)}</p>}
                </div>
                <ActionForm action={discardWebsiteAction}>
                  <input type="hidden" name="key" value={r.key} />
                  <Submit variant="ghost">Undo</Submit>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={`3. Live edits (${live.length})`}>
        {live.length === 0 ? (
          <p className="text-sm text-muted">The site shows its original text and pictures everywhere.</p>
        ) : (
          <ul className="divide-y divide-ink/10">
            {live.map((r) => (
              <li key={r.key} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-mono text-xs text-muted">
                    {r.key} {r.draft != null && <Badge tone="gold">{resetPending(r.draft) ? "back to original on publish" : "changed again"}</Badge>}
                  </p>
                  <p className="mt-0.5 line-clamp-2 whitespace-pre-line">{preview(r.kind, r.published)}</p>
                  <p className="text-xs text-muted">Updated {dt(r.updatedAt)}</p>
                </div>
                {!resetPending(r.draft) && (
                  <ActionForm action={resetWebsiteItemAction} confirm="Put this back to the original when you next publish?">
                    <input type="hidden" name="key" value={r.key} />
                    <Submit variant="ghost">Back to original</Submit>
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
