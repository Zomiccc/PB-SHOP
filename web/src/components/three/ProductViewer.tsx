"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bounds, Center, ContactShadows, Environment, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { PhoneModel } from "./PhoneModel";
import { designFor } from "@/lib/phone-designs";
import { TexturedPhone, type SixTextures } from "./TexturedPhone";
import { Icon } from "../ui/Icon";
import { cn } from "@/lib/format";
import { PRODUCT_LIGHTING as L } from "@/lib/product-lighting";

/**
 * Customer 3D viewer (§4): drag/swipe to rotate, pinch/scroll to zoom, fullscreen.
 * Priority: approved GLB (uploaded or AI-generated) → 6-photo textured model (§14) → licensed Sketchfab embed → procedural model.
 * Lighting follows the strict colour-protection rule (src/lib/product-lighting.ts): white light only, no tone mapping.
 */
export default function ProductViewer({ color, modelUrl, textures, sketchfabUid, name, brand, type }: { color: string; modelUrl?: string | null; textures?: Record<string, string> | null; sketchfabUid?: string | null; name: string; brand?: string; type?: string }) {
  const design = designFor(brand, name, type);
  const wrap = useRef<HTMLDivElement>(null);
  const controls = useRef<OrbitControlsImpl>(null);
  const [inside, setInside] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const onFs = () => setFull(document.fullscreenElement === wrap.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFull = async () => {
    if (!wrap.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await wrap.current.requestFullscreen?.().catch(() => {});
  };

  if (sketchfabUid && !modelUrl && !textures) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] bg-navy-950">
        <iframe
          title={`${name} 3D model`}
          src={`https://sketchfab.com/models/${sketchfabUid}/embed?autospin=0.3&ui_theme=dark&ui_infos=0&ui_watermark=0&dnt=1`}
          allow="autoplay; fullscreen; xr-spatial-tracking"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <div
      ref={wrap}
      className={cn(
        "group relative overflow-hidden bg-[radial-gradient(ellipse_at_50%_35%,#123f6b_0%,#071a2b_70%)]",
        full ? "h-screen w-screen" : "aspect-square rounded-[var(--radius-card)]",
      )}
      onPointerDown={() => setInteracted(true)}
    >
      {/* flat = no tone mapping / auto-exposure; fixed exposure so colours never drift (§6). */}
      <Canvas flat dpr={[1, 2]} camera={{ position: [0, 0, design.w > 1 ? 4.8 : 4.2], fov: 32 }} gl={{ antialias: true, toneMappingExposure: L.exposure }} className="touch-none">
        <ambientLight color={L.ambient.color} intensity={L.ambient.intensity} />
        <directionalLight color={L.key.color} intensity={L.key.intensity} position={L.key.position} />
        <directionalLight color={L.fill.color} intensity={L.fill.intensity} position={L.fill.position} />
        <Suspense fallback={null}>
          {modelUrl ? (
            <Bounds fit clip observe margin={1.3}>
              <Center>
                <GltfModel url={modelUrl} />
              </Center>
            </Bounds>
          ) : textures ? (
            <Idle paused={interacted}>
              <TexturedPhone textures={textures as SixTextures} height={design.h} />
            </Idle>
          ) : (
            <Idle paused={interacted}>
              <PhoneModel color={color} design={design} title={name} explode={inside} accurate />
            </Idle>
          )}
        </Suspense>
        <ContactShadows position={[0, -1.1, 0]} opacity={0.5} scale={6} blur={2.4} far={2.5} />
        {/* Neutral (white-only) reflections — no brand-coloured light ever reaches the product. */}
        <Environment resolution={256}>
          {L.reflections.map((r, i) => (
            <Lightformer key={i} form="rect" color={r.color} intensity={r.intensity} position={r.position} scale={r.scale} rotation-x={r.rotationX ?? 0} rotation-y={r.rotationY ?? 0} />
          ))}
        </Environment>
        <OrbitControls ref={controls} enablePan={false} minDistance={2.2} maxDistance={7} enableDamping dampingFactor={0.08} makeDefault />
      </Canvas>

      {/* Controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
        <span className="rounded-full bg-white/10 px-3 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-white/80 backdrop-blur">
          {modelUrl || textures ? "3D model" : "Interactive 3D preview"}
        </span>
        <div className="pointer-events-auto flex gap-2">
          <button
            onClick={() => {
              controls.current?.reset();
              setInside(0);
            }}
            aria-label="Reset view"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
          >
            <Icon name="rotate" className="h-4 w-4" />
          </button>
          <button onClick={toggleFull} aria-label={full ? "Exit fullscreen" : "Fullscreen"} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20">
            <Icon name={full ? "close" : "expand"} className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!modelUrl && !textures && (
        <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-2xl bg-navy-950/70 px-4 py-3 text-white backdrop-blur">
          <label htmlFor="inside" className="shrink-0 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-gold">Look inside</label>
          <input id="inside" type="range" min={0} max={1} step={0.01} value={inside} onChange={(e) => setInside(Number(e.target.value))} className="w-full accent-[var(--color-gold)]" />
        </div>
      )}

      <p
        className={cn(
          "pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 whitespace-nowrap rounded-full bg-navy-950/70 px-4 py-2 text-xs text-white/85 backdrop-blur transition-opacity duration-500",
          interacted ? "opacity-0" : "opacity-100",
        )}
      >
        Drag to rotate · pinch or scroll to zoom
      </p>
    </div>
  );
}

/** Gentle auto-spin until the customer grabs the model. */
function Idle({ paused, children }: { paused: boolean; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame((s, dt) => {
    if (!g.current) return;
    if (!paused) g.current.rotation.y += dt * 0.45;
    g.current.position.y = Math.sin(s.clock.elapsedTime) * 0.03;
  });
  return <group ref={g}>{children}</group>;
}

function GltfModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}
