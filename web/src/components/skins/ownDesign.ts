"use client";

import { useSyncExternalStore } from "react";
import { cleanSkinImage } from "@/lib/clean-skin-image";

/**
 * The customer's own skin design (v6 §4), kept in this browser tab (sessionStorage) while they try it on different
 * brands / models. It's only sent to us if they order that skin (attached to the order), and never becomes a catalogue skin.
 */

const KEY = "pb-own-skin";
const listeners = new Set<() => void>();
const MAX_EDGE = 2000;

export type OwnDesign = { dataUrl: string; name: string; width: number; height: number };

function read(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function useOwnDesign(): OwnDesign | null {
  const raw = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => null,
  );
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OwnDesign;
  } catch {
    return null;
  }
}

export function clearOwnDesign() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((l) => l());
}

/** Reads a gallery image, scales it to ≤2000px (high-quality smoothing) and keeps it on this device. Throws a friendly message on failure. */
export async function setOwnDesignFromFile(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Choose a picture (JPG, PNG or WebP)");
  if (file.size > 25 * 1024 * 1024) throw new Error("That picture is too large (max 25 MB)");
  let bitmap: ImageBitmap;
  try {
    // Photos of skin sheets: drop the white background and the peel-off strip first.
    bitmap = await createImageBitmap((await cleanSkinImage(file)).file);
  } catch {
    throw new Error("This picture format can't be previewed here — try a JPG or PNG");
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  }
  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  const design: OwnDesign = { dataUrl, name: file.name.replace(/\.[^.]+$/, "").slice(0, 40) || "My design", width: canvas.width, height: canvas.height };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(design));
  } catch {
    throw new Error("Couldn't keep this picture on your device — try a smaller one");
  }
  listeners.forEach((l) => l());
  return design;
}
