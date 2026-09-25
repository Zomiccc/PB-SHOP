"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, Sparkles } from "@react-three/drei";
import { PhoneModel } from "./PhoneModel";

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Eased 0→1 progress of p across the [a, b] window. */
const seg = (p: number, a: number, b: number) => ease(clamp((p - a) / (b - a)));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Scroll story (progress 0 → 1 over the pinned hero):
 *  0.00–0.22  hero: phone floats front-on, follows the pointer
 *  0.22–0.45  turns to show the back (new & used phones chapter)
 *  0.45–0.72  explodes into layers (repair lab chapter)
 *  0.72–1.00  reassembles and settles (CTA chapter)
 */
function Scene({ progress }: { progress: React.RefObject<number> }) {
  const phone = useRef<THREE.Group>(null);
  const rig = useRef<THREE.Group>(null);
  const swooshA = useRef<THREE.Mesh>(null);
  const swooshB = useRef<THREE.Mesh>(null);
  const explode = useRef(0);
  const { viewport, pointer } = useThree();
  const mobile = viewport.aspect < 0.9;

  const smooth = useRef({ p: 0, mx: 0, my: 0 });

  useFrame((state, dt) => {
    const s = smooth.current;
    const target = progress.current ?? 0;
    s.p = (window as unknown as { __pbStoryForced?: boolean }).__pbStoryForced ? target : THREE.MathUtils.damp(s.p, target, 5, dt);
    s.mx = THREE.MathUtils.damp(s.mx, pointer.x, 3, dt);
    s.my = THREE.MathUtils.damp(s.my, pointer.y, 3, dt);
    const p = s.p;
    const t = state.clock.elapsedTime;

    const turn = seg(p, 0.22, 0.45);
    const burst = seg(p, 0.47, 0.64) * (1 - seg(p, 0.74, 0.9));
    const settle = seg(p, 0.76, 1);
    explode.current = burst;

    // Horizontal placement: right of copy on desktop, centred above copy on mobile.
    const side = Math.min(viewport.width * 0.26, 1.6);
    const xHero = mobile ? 0 : side;
    const xBack = mobile ? 0 : -side;
    // Slide across quickly at the start of the turn so the phone never sits behind chapter copy.
    const x = mix(mix(mix(xHero, xBack, seg(p, 0.2, 0.3)), 0, seg(p, 0.45, 0.6)), xHero, settle);
    const y = mobile ? mix(0.8, 0.75, turn) + Math.sin(t * 1.2) * 0.03 : Math.sin(t * 1.2) * 0.04 - 0.02;

    if (phone.current) {
      // One continuous spin across the story: front (-0.35) → back (π+0.35) → side-on exploded (2π-1.2) → front again (2π-0.35).
      const ry = -0.35 + turn * (Math.PI + 0.7) + seg(p, 0.45, 0.62) * (Math.PI - 1.55) + settle * 0.85;
      phone.current.rotation.y = ry + s.mx * 0.35 * (1 - burst);
      phone.current.rotation.x = mix(0.08, 0.28, burst) - s.my * 0.2 * (1 - burst);
      phone.current.rotation.z = mix(0.06, -0.12, burst) * (1 - settle) + 0.04 * settle;
      phone.current.position.set(x, y - burst * 0.14, 0);
      // Fit to viewport height (world units at z=0) so short laptop screens don't crop the phone.
      const fit = Math.min(viewport.height / 2.3, mobile ? 0.68 : 1.1);
      const sc = fit * mix(1, 0.84, burst) * mix(1, 0.96, settle);
      phone.current.scale.setScalar(sc);
    }
    if (rig.current) rig.current.position.x = x;
    if (swooshA.current) {
      swooshA.current.rotation.z = t * 0.35;
      swooshA.current.rotation.x = 1.2 + Math.sin(t * 0.5) * 0.08;
      (swooshA.current.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - burst * 0.7);
    }
    if (swooshB.current) {
      swooshB.current.rotation.z = -t * 0.28 + 2;
      swooshB.current.rotation.x = 1.3 + Math.cos(t * 0.45) * 0.08;
      (swooshB.current.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - burst * 0.7);
    }
    state.camera.position.z = mix(mobile ? 5.2 : 4.4, mobile ? 5.6 : 4.8, burst);
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <ambientLight intensity={0.25} />
      <spotLight position={[3, 5, 4]} angle={0.4} penumbra={1} intensity={60} color="#fff6e6" />
      <pointLight position={[-3, 0.5, 2]} intensity={14} color="#0077d9" />
      <pointLight position={[3, -1, 1.5]} intensity={12} color="#d71920" />
      <pointLight position={[0, 2.5, -2]} intensity={6} color="#d9a62e" />

      <PhoneModel ref={phone} color="#1c3552" explodeRef={explode} />

      {/* Blue + red orbit swooshes echoing the PB logo */}
      <group ref={rig} position={[0, 0, -0.4]}>
        <mesh ref={swooshA}>
          <torusGeometry args={[mobile ? 1.05 : 1.35, 0.012, 16, 160, Math.PI * 1.35]} />
          <meshBasicMaterial color="#0077d9" transparent toneMapped={false} />
        </mesh>
        <mesh ref={swooshB}>
          <torusGeometry args={[mobile ? 1.12 : 1.45, 0.009, 16, 160, Math.PI * 1.1]} />
          <meshBasicMaterial color="#d71920" transparent toneMapped={false} />
        </mesh>
      </group>

      <Sparkles count={mobile ? 40 : 90} scale={[8, 5, 3]} size={2.2} speed={0.35} color="#d9a62e" opacity={0.7} />
      <ContactShadows position={[0, -1.35, 0]} opacity={0.45} scale={8} blur={2.6} far={3} color="#000" />

      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} position={[0, 3, 2]} scale={[6, 1, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={2.2} color="#4aa8ff" position={[-4, 0, 1]} scale={[1, 5, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={2} color="#ff4a52" position={[4, 0, 1]} scale={[1, 5, 1]} rotation-y={-Math.PI / 2} />
        <Lightformer form="ring" intensity={1.5} color="#f3c75b" position={[0, 0, -4]} scale={3} />
      </Environment>
    </>
  );
}

export default function HeroCanvas({ progress }: { progress: React.RefObject<number> }) {
  const dpr = useMemo<[number, number]>(() => [1, typeof window !== "undefined" && window.innerWidth < 768 ? 1.5 : 2], []);
  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0, 4.4], fov: 35 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden
    >
      <Scene progress={progress} />
    </Canvas>
  );
}
