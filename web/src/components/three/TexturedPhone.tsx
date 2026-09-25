"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";

export type SixTextures = { front: string; back: string; left: string; right: string; top: string; bottom: string };

/**
 * Parametric phone body wrapped with the six product photos (§14 "Textured" pipeline).
 * Proportions come from the front photo; the depth from the edge photo. Front/back faces get a
 * rounded-corner alpha mask so photo backgrounds never show at the corners.
 */
export function TexturedPhone({ textures, height = 1.58 }: { textures: SixTextures; height?: number }) {
  const maps = useTexture([textures.right, textures.left, textures.top, textures.bottom, textures.front, textures.back]);

  const { geo, materials } = useMemo(() => {
    maps.forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
    });
    const [right, left, top, bottom, front, back] = maps;
    const img = front.image as { width: number; height: number };
    const edge = right.image as { width: number; height: number };
    const aspect = img.width / img.height || 0.48;
    const w = height * aspect;
    // Edge photo is tall & thin: its width/height ratio × phone height ≈ depth. Clamp to realistic range.
    const d = THREE.MathUtils.clamp((edge.width / edge.height) * height, 0.05, 0.14);

    const alpha = roundedAlpha(aspect);
    const faceMat = (map: THREE.Texture) => new THREE.MeshPhysicalMaterial({ map, alphaMap: alpha, alphaTest: 0.5, roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.1 });
    const edgeMat = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, roughness: 0.35, metalness: 0.4 });
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z
    const materials = [edgeMat(right), edgeMat(left), edgeMat(top), edgeMat(bottom), faceMat(front), faceMat(back)];
    const geo = new THREE.BoxGeometry(w * 0.985, height * 0.985, d, 1, 1, 1);
    return { geo, materials };
  }, [maps, height]);

  return <mesh geometry={geo} material={materials} castShadow />;
}

function roundedAlpha(aspect: number) {
  const W = 256;
  const H = Math.round(W / aspect);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#fff";
  const r = W * 0.14;
  g.beginPath();
  g.roundRect(0, 0, W, H, r);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  return t;
}
