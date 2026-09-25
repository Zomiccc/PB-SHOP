import { parseJson } from "@/lib/format";
import { Badge, dt } from "./Primitives";

type NoteRow = { id: string; body: string; important: boolean; meta: string | null; createdAt: Date; author: { name: string } };

const META_LABELS: Record<string, string> = { issue: "Reported issue", findings: "Inspection findings", work: "Work completed", parts: "Parts used" };

/** Timestamped, author-linked employee notes (§17). */
export function NotesList({ notes }: { notes: NoteRow[] }) {
  if (!notes.length) return <p className="text-sm text-muted">No notes yet.</p>;
  return (
    <ul className="space-y-3">
      {notes.map((n) => {
        const meta = parseJson<Record<string, string>>(n.meta, {});
        return (
          <li key={n.id} className={`rounded-xl p-3 text-sm ${n.important ? "bg-gold/10 ring-1 ring-gold/40" : "bg-cream"}`}>
            <div className="mb-1 flex items-center gap-2 text-xs text-muted">
              <b className="text-ink">{n.author.name}</b> · {dt(n.createdAt)} {n.important && <Badge tone="gold">Important</Badge>}
            </div>
            <p className="whitespace-pre-line">{n.body}</p>
            {Object.keys(meta).length > 0 && (
              <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                {Object.entries(meta).map(([k, v]) => (
                  <div key={k}><dt className="font-semibold">{META_LABELS[k] ?? k}</dt><dd className="text-muted">{v}</dd></div>
                ))}
              </dl>
            )}
          </li>
        );
      })}
    </ul>
  );
}
