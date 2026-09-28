import { humanSize } from "@/lib/format";
import { deleteAttachmentAction, uploadAttachmentsAction } from "@/app/admin/_actions/documents";
import { ActionForm, Submit } from "./ui";
import { ACCEPT, FileField } from "../ui/FileField";
import { Badge, dt } from "./Primitives";
import { Icon } from "../ui/Icon";

type Item = { id: string; kind: string; fileName: string; mimeType: string; size: number; sensitive: boolean; createdAt: Date; uploadedBy?: { name: string } | null };

const KIND_LABEL: Record<string, string> = {
  CNIC_FRONT: "ID card — front",
  CNIC_BACK: "ID card — back",
  PHOTO: "Photo",
  OTHER: "Document",
  CHAT_FILE: "Chat file",
  VOICE_NOTE: "Voice note",
};

/**
 * Private documents for a record. Files open through /api/files/[id] (permission-checked;
 * ID documents are audited on every view) — never through a public URL.
 */
export function Attachments({ items, target, id, canUpload = true, isSuper = false }: { items: Item[]; target: "repair" | "installment" | "used" | "contact"; id: string; canUpload?: boolean; isSuper?: boolean }) {
  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-muted">No documents yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((a) => (
            <li key={a.id} className="flex gap-3 rounded-xl bg-cream p-3 text-sm ring-1 ring-ink/10">
              <a href={`/api/files/${a.id}`} target="_blank" rel="noreferrer" className="shrink-0">
                {/* ID documents are never auto-loaded as thumbnails: each deliberate open is audited. */}
                {a.sensitive ? (
                  <span className="grid h-16 w-16 place-items-center rounded-lg bg-red/10 text-red" title="Restricted — open to view"><Icon name="id-card" className="h-7 w-7" /></span>
                ) : a.mimeType.startsWith("image/") && a.mimeType !== "image/heic" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/files/${a.id}`} alt={KIND_LABEL[a.kind] ?? a.kind} loading="lazy" className="h-16 w-16 rounded-lg object-cover" />
                ) : (
                  <span className="grid h-16 w-16 place-items-center rounded-lg bg-ink/5 font-mono text-xs uppercase text-muted">{a.fileName.split(".").pop()}</span>
                )}
              </a>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 font-semibold">
                  {KIND_LABEL[a.kind] ?? a.kind}
                  {a.sensitive && <Badge tone="red">Restricted</Badge>}
                </p>
                <p className="truncate text-xs text-muted">{a.fileName} · {humanSize(a.size)}</p>
                <p className="text-xs text-muted">{dt(a.createdAt)}{a.uploadedBy ? ` · ${a.uploadedBy.name}` : " · customer"}</p>
                <div className="mt-1.5 flex gap-3 text-xs">
                  <a href={`/api/files/${a.id}`} target="_blank" rel="noreferrer" className="text-blue">Open</a>
                  <a href={`/api/files/${a.id}?download=1`} className="text-blue">Download</a>
                  {(!a.sensitive || isSuper) && (
                    <ActionForm action={deleteAttachmentAction} confirm="Remove this file? This is recorded in the audit log.">
                      <input type="hidden" name="id" value={a.id} />
                      <button className="text-red">Remove</button>
                    </ActionForm>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {canUpload && (
        <ActionForm action={uploadAttachmentsAction} resetOnSuccess className="space-y-3 rounded-xl border-2 border-dashed border-ink/15 p-3">
          <input type="hidden" name="target" value={target} />
          <input type="hidden" name="id" value={id} />
          <FileField name="files" label="Other documents / attachments" accept={ACCEPT.docs} multiple maxFiles={5} tone="panel" />
          <div className="flex flex-wrap items-center gap-3">
            <select name="kind" aria-label="Document type" className="field !w-auto !py-2 text-sm">
              <option value="OTHER">Supporting document</option>
              <option value="PHOTO">Photo</option>
              {target !== "repair" && target !== "contact" && (
                <>
                  <option value="CNIC_FRONT">ID card — front</option>
                  <option value="CNIC_BACK">ID card — back</option>
                </>
              )}
            </select>
            <Submit>Upload</Submit>
          </div>
        </ActionForm>
      )}
    </div>
  );
}
