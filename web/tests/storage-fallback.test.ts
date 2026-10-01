import { describe, expect, it, vi } from "vitest";

// Simulate a read-only server disk (like Vercel) with no object storage configured.
vi.mock("node:fs/promises", async (orig) => ({
  ...(await orig<typeof import("node:fs/promises")>()),
  mkdir: vi.fn(async () => {
    throw Object.assign(new Error("read-only file system"), { code: "EROFS" });
  }),
}));

import { db } from "@/lib/db";
import { saveUpload } from "@/lib/storage";

describe("Six-photo 3D uploads on a read-only server (§11)", () => {
  it("keeps the photo in the database and returns a working /api/media URL", async () => {
    const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1]);
    const url = await saveUpload(new File([jpg], "front.jpg", { type: "image/jpeg" }), "model-sources/test");
    expect(url).toMatch(/^\/api\/media\/\w+$/);
    const m = await db.mediaFile.findUniqueOrThrow({ where: { id: url.split("/").pop()! } });
    expect(m.mimeType).toBe("image/jpeg");
    expect(Buffer.from(m.data!).equals(Buffer.from(jpg))).toBe(true);
  });
});
