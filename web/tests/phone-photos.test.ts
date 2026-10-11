/**
 * Real photos for the in-stock phones and the "Open app" button on the payment page (client requests, 11 Oct 2026).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RUNNING_MODELS } from "../prisma/running-models";
import { PHONE_PHOTOS, photosFor } from "../prisma/phone-photos";
import { PAYMENT_ACCOUNTS, appLink } from "@/lib/payment-accounts";

const pub = (p: string) => path.join(__dirname, "..", "public", p);

describe("Phone photos", () => {
  it("every in-stock phone has at least one photo, and every file exists", () => {
    for (const m of RUNNING_MODELS) expect(PHONE_PHOTOS[m.modelNo]?.length, m.name).toBeGreaterThan(0);
    for (const list of Object.values(PHONE_PHOTOS)) for (const p of list) expect(fs.existsSync(pub(p)), p).toBe(true);
  });

  it("RAM / storage versions of one phone share its photos without duplicates", () => {
    expect(photosFor(["X6728", "X6728B"])).toEqual(PHONE_PHOTOS.X6728);
  });

  it("the homepage tablet tile uses a real tablet photo", () => {
    expect(fs.existsSync(pub("/products/tablets/infinix-xpad.webp"))).toBe(true);
  });
});

describe("Open the payment app", () => {
  const android = "Mozilla/5.0 (Linux; Android 14; SM-A155F) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36";
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
  const desktop = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36";

  it("opens the Easypaisa app itself on Android through a link its start screen handles, Play Store if not installed", () => {
    const link = appLink(PAYMENT_ACCOUNTS.EASYPAISA.app, android)!;
    expect(link.startsWith("intent://easypaisa.onelink.me/cw4d#Intent;scheme=https;package=pk.com.telenor.phoenix;")).toBe(true);
    expect(decodeURIComponent(link)).toContain("play.google.com/store/apps/details?id=pk.com.telenor.phoenix");
  });

  it("opens the JazzCash app on Android through jazzcash://deeplink", () => {
    expect(appLink(PAYMENT_ACCOUNTS.JAZZCASH.app, android)!.startsWith("intent://deeplink#Intent;scheme=jazzcash;package=com.techlogix.mobilinkcustomer;")).toBe(true);
  });

  it("Faysal DigiBank (no browser link in the app) goes to its Play Store page, which shows Open", () => {
    expect(appLink(PAYMENT_ACCOUNTS.FAYSAL.app, android)).toBe("https://play.google.com/store/apps/details?id=com.avanza.ambitwizfbl");
  });

  it("uses Easypaisa's own app link on iPhone, the App Store elsewhere, and shows nothing on a computer", () => {
    expect(appLink(PAYMENT_ACCOUNTS.EASYPAISA.app, iphone)).toBe("https://easypaisa.onelink.me/cw4d/d16aphk9");
    expect(appLink(PAYMENT_ACCOUNTS.JAZZCASH.app, iphone)).toBe("https://apps.apple.com/pk/app/id1224617688");
    expect(appLink(PAYMENT_ACCOUNTS.FAYSAL.app, desktop)).toBeNull();
  });
});
