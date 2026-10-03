/**
 * Website editor (client request): owner edits text / pictures / videos / sections, then publishes.
 */
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { discardDrafts, getDrafts, getPublishedContent, publishDrafts, saveDraft } from "@/lib/site-content";
import { safeHref, validValue, youtubeId } from "@/lib/site-content-types";
import { makeStaff } from "./helpers";

describe("Website editor — what may be saved", () => {
  it("accepts text (and an empty string to hide it), refuses huge text", () => {
    expect(validValue("TEXT", "Buy\nFix\nStyle")).toBe("Buy\nFix\nStyle");
    expect(validValue("TEXT", "")).toBe("");
    expect(validValue("TEXT", "x".repeat(6000))).toBeNull();
    expect(validValue("TEXT", 5)).toBeNull();
  });

  it("pictures / videos must be our own uploads or https; YouTube links become ids", () => {
    expect(validValue("MEDIA", { kind: "IMAGE", url: "/api/media/abc123", alt: "x" })).toEqual({ kind: "IMAGE", url: "/api/media/abc123", alt: "x" });
    expect(validValue("MEDIA", { kind: "VIDEO", url: "javascript:alert(1)" })).toBeNull();
    expect(validValue("MEDIA", { kind: "IMAGE", url: "//evil.example/x.png" })).toBeNull();
    expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://vimeo.com/123")).toBeNull();
  });

  it("section buttons only link to our pages or https / WhatsApp-style links", () => {
    expect(safeHref("/new-phones")).toBe("/new-phones");
    expect(safeHref("https://wa.me/923001234567")).toBe("https://wa.me/923001234567");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(validValue("ZONE", [{ id: "a1", type: "text", title: "Hi", buttonText: "Go", buttonHref: "javascript:alert(1)" }])).toBeNull();
    expect(validValue("ZONE", [{ id: "a1", type: "image" }])).toBeNull(); // a picture section needs a picture
    expect(validValue("ZONE", [{ id: "a1", type: "text", title: "Eid offer", body: "10% off" }])).toEqual([{ id: "a1", type: "text", title: "Eid offer", body: "10% off" }]);
  });
});

describe("Website editor — drafts and publishing", () => {
  it("visitors only see changes after Publish; Back to original removes them", async () => {
    const staff = await makeStaff("SUPER_ADMIN");
    const key = `test.${Date.now()}.title`;
    await saveDraft({ key, kind: "TEXT", value: "Draft text", staffId: staff.id });
    expect((await getDrafts())[key]?.value).toBe("Draft text");
    expect((await getPublishedContent())[key]).toBeUndefined();

    await publishDrafts();
    expect((await getPublishedContent())[key]).toBe("Draft text");
    expect((await getDrafts())[key]).toBeUndefined();

    await saveDraft({ key, kind: "TEXT", reset: true, staffId: staff.id });
    await publishDrafts();
    expect(await db.siteContent.findUnique({ where: { key } })).toBeNull();
  });

  it("discarding a draft keeps what's live", async () => {
    const staff = await makeStaff("SUPER_ADMIN");
    const key = `test.${Date.now()}.text`;
    await saveDraft({ key, kind: "TEXT", value: "Live", staffId: staff.id });
    await publishDrafts();
    await saveDraft({ key, kind: "TEXT", value: "Not yet", staffId: staff.id });
    await discardDrafts(key);
    expect((await getPublishedContent())[key]).toBe("Live");
    expect((await getDrafts())[key]).toBeUndefined();
    await db.siteContent.delete({ where: { key } });
  });

  it("refuses content that isn't allowed", async () => {
    const staff = await makeStaff("SUPER_ADMIN");
    await expect(saveDraft({ key: "test.bad", kind: "MEDIA", value: { kind: "IMAGE", url: "javascript:x" }, staffId: staff.id })).rejects.toThrow();
  });
});
