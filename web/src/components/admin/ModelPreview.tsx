"use client";

import dynamic from "next/dynamic";

const ProductViewer = dynamic(() => import("../three/ProductViewer"), { ssr: false, loading: () => <div className="aspect-square animate-pulse rounded-2xl bg-navy-900" /> });

/** Admin preview uses the exact customer viewer, so what staff approve is what customers see. */
export function ModelPreview({ kind, url, textures, color, name = "Preview", brand }: { kind: string | null; url: string | null; textures: Record<string, string> | null; color: string; name?: string; brand?: string }) {
  return (
    <div className="max-w-md">
      <ProductViewer name={name} brand={brand} color={color} modelUrl={kind === "GLB" ? url : null} textures={kind === "TEXTURED" ? textures : null} />
    </div>
  );
}
