"use client";

import { forwardRef, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PB_DESIGN, type PhoneDesign } from "@/lib/phone-designs";

/**
 * Procedural smartphone built from extruded rounded-rect plates so it can "explode"
 * into its layers (screen → frame → logic board → battery → back glass) for the
 * repair-lab scroll story.
 *
 * Body proportions, corner radius, camera island and lens layout, and front camera style
 * come from a PhoneDesign (src/lib/phone-designs.ts), so a Galaxy Ultra, a Pixel and an
 * iPhone each look like themselves. Used until an approved GLB (§4) or 6-photo model (§14)
 * is attached to the product.
 */

function roundedRect(w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + rr, y);
  s.lineTo(x + w - rr, y);
  s.quadraticCurveTo(x + w, y, x + w, y + rr);
  s.lineTo(x + w, y + h - rr);
  s.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  s.lineTo(x + rr, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - rr);
  s.lineTo(x, y + rr);
  s.quadraticCurveTo(x, y, x + rr, y);
  return s;
}

function plate(w: number, h: number, r: number, depth: number, bevel = 0.006) {
  const g = new THREE.ExtrudeGeometry(roundedRect(w, h, r), {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 24,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

function frameGeometry(w: number, h: number, r: number, d: number, flat: boolean) {
  const outer = roundedRect(w, h, r);
  const t = 0.028;
  const hole = roundedRect(w - t * 2, h - t * 2, Math.max(0.01, r - t * 0.8));
  outer.holes.push(new THREE.Path(hole.getPoints(48)));
  const bevel = flat ? 0.004 : 0.01;
  const g = new THREE.ExtrudeGeometry(outer, { depth: d - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: flat ? 0.003 : 0.008, bevelSegments: flat ? 2 : 6, curveSegments: 32 });
  g.translate(0, 0, -(d - bevel * 2) / 2);
  return g;
}

/**
 * Lock screen drawn to a canvas. The home-page PB device shows the store brand; product
 * models show the product name on a wallpaper tinted from the device colour, with an
 * iOS-style centred clock or an Android-style left clock depending on the design.
 */
function useScreenTexture(design: PhoneDesign, title: string | undefined, color: string) {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const W = 512;
    const H = Math.round(W * (design.h / design.w));
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    const pb = design.key === "pb";

    const tint = new THREE.Color(color);
    const deep = tint.clone().multiplyScalar(0.25).getStyle();
    const mid = tint.clone().lerp(new THREE.Color("#0a2c4e"), 0.5).getStyle();
    const bg = g.createLinearGradient(0, 0, W * 0.4, H);
    bg.addColorStop(0, pb ? "#071a2b" : deep);
    bg.addColorStop(0.5, pb ? "#0a2c4e" : mid);
    bg.addColorStop(1, pb ? "#071a2b" : deep);
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);

    const glow = (x: number, y: number, r: number, col: string) => {
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, col);
      rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg;
      g.fillRect(0, 0, W, H);
    };
    if (pb) {
      glow(80, H * 0.68, 420, "rgba(0,119,217,0.85)");
      glow(470, H * 0.85, 380, "rgba(215,25,32,0.75)");
      glow(260, H * 0.28, 260, "rgba(217,166,46,0.18)");
    } else {
      glow(W * 0.2, H * 0.7, 420, tint.clone().lerp(new THREE.Color("#ffffff"), 0.2).getStyle().replace("rgb", "rgba").replace(")", ",0.75)"));
      glow(W * 0.9, H * 0.35, 340, "rgba(0,119,217,0.35)");
    }

    const android = design.front !== "island" && design.front !== "notch";
    g.fillStyle = "#fff";
    g.textAlign = android ? "left" : "center";
    const cx = android ? 52 : W / 2;
    g.font = "600 32px Inter, system-ui, sans-serif";
    g.globalAlpha = 0.85;
    g.fillText("Friday, 25 September", cx, android ? 250 : 190);
    g.globalAlpha = 1;
    g.font = `${android ? 300 : 800} ${android ? 170 : 150}px Inter, system-ui, sans-serif`;
    if (android) {
      g.fillText("09", cx, 420);
      g.fillText("41", cx, 580);
    } else g.fillText("9:41", cx, 340);

    g.textAlign = "center";
    if (pb) {
      g.font = "italic 900 190px Inter, system-ui, sans-serif";
      g.fillText("PB", W / 2, H * 0.62);
      g.font = "700 40px Inter, system-ui, sans-serif";
      g.fillStyle = "#d9a62e";
      g.fillText("M O B I L E S", W / 2, H * 0.62 + 80);
    } else if (title) {
      g.font = "800 46px Inter, system-ui, sans-serif";
      const words = title.split(" ");
      const lines: string[] = [];
      let line = "";
      for (const w of words) {
        if (g.measureText(`${line} ${w}`).width > W - 80 && line) {
          lines.push(line);
          line = w;
        } else line = line ? `${line} ${w}` : w;
      }
      lines.push(line);
      lines.forEach((l, i) => g.fillText(l, W / 2, H * 0.74 + i * 54));
      g.font = "600 24px Inter, system-ui, sans-serif";
      g.fillStyle = "#d9a62e";
      g.fillText("at PB Mobiles", W / 2, H * 0.74 + lines.length * 54 + 6);
    }

    // dock
    g.fillStyle = "rgba(255,255,255,0.12)";
    roundRect(g, 40, H - 170, W - 80, 120, 44);
    g.fill();
    ["#0077d9", "#d71920", "#d9a62e", "#ffffff"].forEach((col, i) => {
      g.fillStyle = col;
      g.globalAlpha = 0.85;
      roundRect(g, 72 + i * 102, H - 150, 80, 80, android ? 40 : 22);
      g.fill();
    });
    g.globalAlpha = 1;

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, [design, title, color]);
}

/** Engraved brand text on the back glass (non-Apple designs). */
function useLogoTexture(text: string | undefined) {
  return useMemo(() => {
    if (!text || typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "rgba(255,255,255,0.55)";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `${text.length <= 2 ? "800 96px" : "600 64px"} Inter, system-ui, sans-serif`;
    g.fillText(text.length > 2 ? text.toUpperCase().split("").join(" ") : text, 256, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text]);
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export type PhoneModelProps = {
  color?: string;
  design?: PhoneDesign;
  /** Product name shown on the lock screen. */
  title?: string;
  /** 0 = assembled, 1 = fully exploded. Pass a ref for per-frame animation without re-renders. */
  explode?: number;
  explodeRef?: React.RefObject<number>;
  screenOn?: boolean;
} & React.ComponentProps<"group">;

export const PhoneModel = forwardRef<THREE.Group, PhoneModelProps>(function PhoneModel(
  { color = "#1a2a3c", design = PB_DESIGN, title, explode = 0, explodeRef, screenOn = true, ...props },
  ref,
) {
  const { w, h, d, r } = design;
  const screenTex = useScreenTexture(design, title, color);
  const logoTex = useLogoTexture(design.logo === "text" && design.key !== "pb" ? design.logoText : undefined);

  const geo = useMemo(() => {
    const display = new THREE.ShapeGeometry(roundedRect(w - 0.05, h - 0.05, Math.max(0.01, r - 0.025)), 24);
    // UV-map the display so the canvas texture spans the rounded screen.
    const pos = display.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = (pos.getX(i) + (w - 0.05) / 2) / (w - 0.05);
      uv[i * 2 + 1] = (pos.getY(i) + (h - 0.05) / 2) / (h - 0.05);
    }
    display.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return {
      frame: frameGeometry(w, h, r, d, design.frame === "flat"),
      back: plate(w - 0.012, h - 0.012, Math.max(0.01, r - 0.005), 0.008),
      screen: plate(w - 0.02, h - 0.02, Math.max(0.01, r - 0.01), 0.006, 0.004),
      display,
      islands: design.islands.map((i) => plate(i.w, i.h, i.r, 0.018, 0.006)),
      board: plate(w - 0.12, h * 0.39, 0.04, 0.012, 0.002),
      battery: plate(w - 0.14, h * 0.44, 0.03, 0.03, 0.004),
    };
  }, [w, h, r, d, design]);

  const mats = useMemo(() => {
    const c = new THREE.Color(color);
    const roughness = design.frame === "polished" ? 0.14 : design.frame === "satin" ? 0.34 : 0.26;
    return {
      frame: new THREE.MeshStandardMaterial({ color: c.clone().lerp(new THREE.Color("#c9ced6"), 0.35), metalness: 1, roughness }),
      back: new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.2, roughness: design.frame === "satin" ? 0.45 : 0.25, clearcoat: 1, clearcoatRoughness: design.frame === "satin" ? 0.4 : 0.08 }),
      glass: new THREE.MeshPhysicalMaterial({ color: "#05080c", metalness: 0.1, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 }),
      lensRing: new THREE.MeshStandardMaterial({ color: c.clone().lerp(new THREE.Color("#e6e9ee"), 0.5), metalness: 1, roughness: 0.18 }),
      lens: new THREE.MeshPhysicalMaterial({ color: "#060a12", metalness: 0.4, roughness: 0.02, clearcoat: 1, iridescence: 0.7, iridescenceIOR: 1.6 }),
      islandBody: new THREE.MeshPhysicalMaterial({ color: c.clone().multiplyScalar(0.92), metalness: 0.25, roughness: 0.35, clearcoat: 0.8 }),
      islandDark: new THREE.MeshPhysicalMaterial({ color: "#0d1117", metalness: 0.5, roughness: 0.3, clearcoat: 0.7 }),
      islandGlass: new THREE.MeshPhysicalMaterial({ color: c.clone().multiplyScalar(0.75), metalness: 0.3, roughness: 0.12, clearcoat: 1 }),
      board: new THREE.MeshStandardMaterial({ color: "#0b2a3f", metalness: 0.3, roughness: 0.55 }),
      chip: new THREE.MeshStandardMaterial({ color: "#111418", metalness: 0.6, roughness: 0.35 }),
      gold: new THREE.MeshStandardMaterial({ color: "#d9a62e", metalness: 1, roughness: 0.25, emissive: "#d9a62e", emissiveIntensity: 0.15 }),
      battery: new THREE.MeshStandardMaterial({ color: "#1b1f26", metalness: 0.5, roughness: 0.4 }),
      batteryLabel: new THREE.MeshStandardMaterial({ color: "#0077d9", metalness: 0.2, roughness: 0.5, emissive: "#0077d9", emissiveIntensity: 0.25 }),
      flash: new THREE.MeshStandardMaterial({ color: "#fff4d6", emissive: "#fff1c9", emissiveIntensity: 0.4 }),
      logo: logoTex ? new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, depthWrite: false }) : null,
    };
  }, [color, design, logoTex]);

  const displayMat = useMemo(() => new THREE.MeshBasicMaterial({ map: screenTex ?? undefined, color: screenOn ? "#ffffff" : "#050709", toneMapped: false }), [screenTex, screenOn]);

  const screenG = useRef<THREE.Group>(null);
  const boardG = useRef<THREE.Group>(null);
  const batteryG = useRef<THREE.Group>(null);
  const backG = useRef<THREE.Group>(null);

  useFrame(() => {
    const e = explodeRef?.current ?? explode;
    if (screenG.current) screenG.current.position.z = d / 2 - 0.004 + e * 0.9;
    if (boardG.current) boardG.current.position.z = 0.012 + e * 0.38;
    if (batteryG.current) batteryG.current.position.z = -0.01 - e * 0.3;
    if (backG.current) backG.current.position.z = -d / 2 + 0.004 - e * 0.78;
  });

  const islandMat = (tone?: string) => (tone === "dark" ? mats.islandDark : tone === "body" ? mats.islandBody : mats.islandGlass);
  const ringDepth = design.ringed ? 0.036 : 0.03;
  const lensBase = design.islands.length ? 0.03 : 0.022;

  return (
    <group ref={ref} {...props} dispose={null}>
      {/* Frame + side buttons */}
      <mesh geometry={geo.frame} material={mats.frame} castShadow />
      <mesh material={mats.frame} position={[w / 2 + 0.006, h * 0.2, 0]}>
        <boxGeometry args={[0.012, 0.18, 0.03]} />
      </mesh>
      <mesh material={mats.frame} position={[-w / 2 - 0.006, h * 0.27, 0]}>
        <boxGeometry args={[0.012, 0.1, 0.03]} />
      </mesh>
      <mesh material={mats.frame} position={[-w / 2 - 0.006, h * 0.17, 0]}>
        <boxGeometry args={[0.012, 0.1, 0.03]} />
      </mesh>

      {/* Front: cover glass + live display + front camera (island / notch / punch-hole) */}
      <group ref={screenG} position={[0, 0, d / 2 - 0.004]}>
        <mesh geometry={geo.screen} material={mats.glass} />
        <mesh geometry={geo.display} material={displayMat} position={[0, 0, 0.0075]} />
        {design.front === "island" && (
          <mesh position={[0, h / 2 - 0.075, 0.008]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.022, 0.1, 8, 16]} />
            <meshBasicMaterial color="#000" />
          </mesh>
        )}
        {design.front === "notch" && (
          <mesh position={[0, h / 2 - 0.05, 0.008]}>
            <planeGeometry args={[0.26, 0.07]} />
            <meshBasicMaterial color="#000" />
          </mesh>
        )}
        {(design.front === "punch" || design.front === "punch-left") && (
          <mesh position={[design.front === "punch-left" ? -w / 2 + 0.09 : 0, h / 2 - 0.07, 0.008]}>
            <circleGeometry args={[0.02, 24]} />
            <meshBasicMaterial color="#000" />
          </mesh>
        )}
      </group>

      {/* Internals: logic board with gold traces, battery */}
      <group ref={boardG} position={[0, h * 0.23, 0.012]}>
        <mesh geometry={geo.board} material={mats.board} />
        <mesh material={mats.chip} position={[0.1, 0.05, 0.012]}>
          <boxGeometry args={[0.2, 0.18, 0.014]} />
        </mesh>
        <mesh material={mats.gold} position={[0.1, 0.05, 0.02]}>
          <boxGeometry args={[0.08, 0.06, 0.003]} />
        </mesh>
        <mesh material={mats.chip} position={[-0.17, -0.12, 0.01]}>
          <boxGeometry args={[0.12, 0.1, 0.01]} />
        </mesh>
        <mesh material={mats.chip} position={[0.16, -0.18, 0.01]}>
          <boxGeometry args={[0.1, 0.08, 0.01]} />
        </mesh>
        {[-0.2, -0.1, 0, 0.1].map((y, i) => (
          <mesh key={i} material={mats.gold} position={[-0.08, y + 0.08, 0.008]}>
            <boxGeometry args={[0.26 - i * 0.03, 0.006, 0.002]} />
          </mesh>
        ))}
      </group>
      <group ref={batteryG} position={[0, -h * 0.21, -0.01]}>
        <mesh geometry={geo.battery} material={mats.battery} />
        <mesh material={mats.batteryLabel} position={[0, 0, 0.02]}>
          <planeGeometry args={[0.36, 0.14]} />
        </mesh>
      </group>

      {/* Back glass + camera layout from the design (x+ = viewer's right when looking at the back). */}
      <group ref={backG} position={[0, 0, -d / 2 + 0.004]} rotation={[0, Math.PI, 0]}>
        <mesh geometry={geo.back} material={mats.back} />
        {design.islands.map((isl, i) => (
          <mesh key={i} geometry={geo.islands[i]} material={islandMat(isl.tone)} position={[isl.x, isl.y, 0.012]} />
        ))}
        {design.lenses.map((l, i) => (
          <group key={i} position={[l.x, l.y, lensBase]}>
            <mesh material={mats.lensRing} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[l.r, l.r * 1.03, ringDepth, 40]} />
            </mesh>
            <mesh material={mats.lens} position={[0, 0, ringDepth / 2 + 0.0005]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[l.r * 0.72, l.r * 0.72, 0.002, 40]} />
            </mesh>
          </group>
        ))}
        {design.flash.map((f, i) => (
          <mesh key={i} material={mats.flash} position={[f.x, f.y, lensBase - 0.002]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[f.r, f.r, 0.01, 20]} />
          </mesh>
        ))}
        {mats.logo && (
          <mesh material={mats.logo} position={[0, -h * 0.36, 0.0085]}>
            <planeGeometry args={[w * 0.5, w * 0.125]} />
          </mesh>
        )}
      </group>
    </group>
  );
});
