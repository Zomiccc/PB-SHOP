/**
 * Browser side of the chunked media upload (see src/lib/media-upload.ts): sends the file in ~3 MB pieces
 * with a progress callback, then returns its public URL and kind.
 */
export async function uploadMedia(file: File, folder: "broadcasts", onProgress?: (fraction: number) => void) {
  const json = async (res: Response) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Upload failed");
    return data;
  };
  const start = await json(await fetch("/api/admin/uploads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, mimeType: file.type, size: file.size, folder }) }));
  const { id, chunkSize, chunks } = start as { id: string; chunkSize: number; chunks: number };
  for (let i = 0; i < chunks; i++) {
    const piece = file.slice(i * chunkSize, Math.min(file.size, (i + 1) * chunkSize));
    // One retry per piece — mobile connections drop now and then.
    for (let attempt = 0; ; attempt++) {
      try {
        await json(await fetch(`/api/admin/uploads/${id}?i=${i}`, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: piece }));
        break;
      } catch (e) {
        if (attempt >= 1) throw e;
      }
    }
    onProgress?.((i + 1) / chunks);
  }
  return (await json(await fetch(`/api/admin/uploads/${id}`, { method: "POST" }))) as { url: string; type: "IMAGE" | "VIDEO" };
}
