"use client";

import { useSyncExternalStore } from "react";

/**
 * The customer's own skin design (v6 §4), kept only in this browser tab (sessionStorage) — it is never uploaded
 * to the server and never becomes a catalogue skin. It stays while they switch brands / models.
 */

const KEY = "pb-own-skin";
const listeners = new Set<() => void>();
const MAX_EDGE = 1600;

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

/** Reads a gallery image, scales it to ≤1600px and keeps it on this device. Throws a friendly message on failure. */
export async function setOwnDesignFromFile(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Choose a picture (JPG, PNG or WebP)");
  if (file.size > 25 * 1024 * 1024) throw new Error("That picture is too large (max 25 MB)");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This picture format can't be previewed here — try a JPG or PNG");
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const design: OwnDesign = { dataUrl, name: file.name.replace(/\.[^.]+$/, "").slice(0, 40) || "My design", width: canvas.width, height: canvas.height };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(design));
  } catch {
    throw new Error("Couldn't keep this picture on your device — try a smaller one");
  }
  listeners.forEach((l) => l());
  return design;
}
