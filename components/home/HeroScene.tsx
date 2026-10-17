"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export type HeroProgress = { current: number };

/** Route a photo through the Next.js optimiser so the GPU gets a WebP/AVIF at a sensible size. */
const optimised = (src: string, w: number) => `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`;

const CAMERA_START = 6;
const CAMERA_END = -13;
const BACKDROP_Z = -58;

// Leaves are a free-floating cluster (any side, any angle). The palm fronds are cut off along
// their bottom and outer edges, so they only grow up from the bottom with those edges off screen.
type Layer = { z: number; tex: "leaves" | "fronds"; side: -1 | 1; anchor: "top" | "bottom"; width: number; rot: number; shade: number };

// Foliage frames the view at several depths; the camera flies through them.
const LAYERS_DESKTOP: Layer[] = [
  { z: 3.4, tex: "leaves", side: -1, anchor: "top", width: 0.62, rot: -0.12, shade: 0.34 },
  { z: 2.8, tex: "fronds", side: 1, anchor: "bottom", width: 0.7, rot: 0, shade: 0.3 },
  { z: 0.6, tex: "leaves", side: 1, anchor: "top", width: 0.5, rot: 0.42, shade: 0.48 },
  { z: -0.4, tex: "fronds", side: -1, anchor: "bottom", width: 0.62, rot: 0, shade: 0.46 },
  { z: -3.4, tex: "leaves", side: -1, anchor: "bottom", width: 0.5, rot: 2.9, shade: 0.62 },
  { z: -4.2, tex: "leaves", side: 1, anchor: "top", width: 0.5, rot: -0.1, shade: 0.62 },
  { z: -7.4, tex: "fronds", side: 1, anchor: "bottom", width: 0.56, rot: 0, shade: 0.78 },
  { z: -8.4, tex: "leaves", side: -1, anchor: "top", width: 0.48, rot: 0.15, shade: 0.8 },
];
const LAYERS_MOBILE: Layer[] = LAYERS_DESKTOP.filter((_, i) => i % 2 === 0);

function mistTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, "rgba(255,255,255,0.9)");
  grd.addColorStop(0.45, "rgba(255,255,255,0.35)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Size of the visible frustum at a given distance from the camera. */
function frustumAt(camera: THREE.PerspectiveCamera, distance: number) {
  const h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
  return { w: h * camera.aspect, h };
}

function World({ backdrop, progress, mobile, onReady }: { backdrop: string; progress: HeroProgress; mobile: boolean; onReady: () => void }) {
  const camera = useThree((s) => s.camera as THREE.PerspectiveCamera);
  const size = useThree((s) => s.size);
  const [land, leaves, fronds] = useLoader(THREE.TextureLoader, [
    optimised(backdrop, mobile ? 1080 : 1920),
    optimised("/media/3d/leaves.webp", mobile ? 828 : 1440),
    optimised("/media/3d/fronds.webp", mobile ? 828 : 1440),
  ]);
  const mist = useMemo(mistTexture, []);
  const layers = mobile ? LAYERS_MOBILE : LAYERS_DESKTOP;
  const backdropRef = useRef<THREE.Mesh>(null);
  const mistRefs = useRef<THREE.Mesh[]>([]);
  const eased = useRef(0);
  const pointer = useRef(new THREE.Vector2());

  useMemo(() => {
    for (const t of [land, leaves, fronds]) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
    }
  }, [land, leaves, fronds]);

  useEffect(onReady, [onReady]);

  useEffect(() => {
    if (mobile) return;
    const move = (e: PointerEvent) => pointer.current.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [mobile]);

  // Backdrop covers the frustum at its distance from the start position, with room for parallax.
  const backdropSize = useMemo(() => {
    const f = frustumAt(camera, CAMERA_START - BACKDROP_Z);
    const imgAspect = (land.image as HTMLImageElement).width / (land.image as HTMLImageElement).height;
    const w = Math.max(f.w, f.h * imgAspect) * 1.12;
    return [w, w / imgAspect] as const;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, land, size.width, size.height]);

  const frame = (z: number) => frustumAt(camera, CAMERA_START - z);

  useFrame((state, delta) => {
    const k = 1 - Math.pow(0.0015, delta);
    eased.current += (progress.current - eased.current) * k;
    const p = eased.current;
    const t = state.clock.elapsedTime;
    // The flight spans most of the hold, easing in and settling as the land opens up.
    const q = Math.min(1, p / 0.8);
    const travel = q * q * (3 - 2 * q);
    const cam = state.camera;
    cam.position.z = THREE.MathUtils.lerp(CAMERA_START, CAMERA_END, travel);
    cam.position.x += (pointer.current.x * 0.35 - cam.position.x) * k;
    cam.position.y += (-pointer.current.y * 0.22 + Math.sin(t * 0.25) * 0.05 - cam.position.y) * k;
    cam.lookAt(cam.position.x * 0.3, cam.position.y * 0.3, BACKDROP_Z);
    if (backdropRef.current) backdropRef.current.position.y = -p * 1.4;
    mistRefs.current.forEach((m, i) => {
      if (!m) return;
      m.position.x = Math.sin(t * 0.04 + i * 1.7) * 3 + (i % 2 ? 2 : -2);
    });
  });

  return (
    <>
      <mesh ref={backdropRef} position={[0, 0, BACKDROP_Z]}>
        <planeGeometry args={[backdropSize[0], backdropSize[1]]} />
        <meshBasicMaterial map={land} fog={false} toneMapped={false} />
      </mesh>

      {[-14, -26, -38].map((z, i) => {
        const f = frame(z);
        return (
          <mesh key={z} ref={(m) => void (mistRefs.current[i] = m!)} position={[0, -f.h * 0.28, z]}>
            <planeGeometry args={[f.w * 1.6, f.h * 0.9]} />
            <meshBasicMaterial map={mist} transparent opacity={0.22 - i * 0.04} depthWrite={false} fog={false} color="#f3e6dc" />
          </mesh>
        );
      })}

      {layers.map((l, i) => {
        const f = frame(l.z);
        const tex = l.tex === "leaves" ? leaves : fronds;
        const w = f.w * l.width;
        const h = w / 1.77;
        // Cut edges sit just outside the frame: outward on x, and below it for the fronds.
        const x = l.side * (f.w / 2 - w * (l.tex === "fronds" ? 0.28 : 0.36));
        const y = l.anchor === "top" ? f.h / 2 - h * 0.3 : -f.h / 2 + h * (l.tex === "fronds" ? 0.34 : 0.3);
        return (
          <mesh key={i} position={[x, y, l.z]} rotation={[0, 0, l.rot]} scale={[l.side === 1 ? -1 : 1, 1, 1]}>
            <planeGeometry args={[w, h]} />
            <meshBasicMaterial map={tex} transparent alphaTest={0.02} depthWrite={false} color={new THREE.Color().setScalar(l.shade)} />
          </mesh>
        );
      })}
    </>
  );
}

/**
 * The homepage opening: a misty landscape seen through layered jungle leaves and palm fronds.
 * Scroll moves the camera forward through the foliage. Rendering pauses while off screen.
 */
export default function HeroScene({ backdrop, progress, onReady }: { backdrop: string; progress: HeroProgress; onReady: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [mobile] = useState(() => window.matchMedia("(max-width: 767px), (pointer: coarse)").matches);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    const onVis = () => setVisible(!document.hidden && el.getBoundingClientRect().bottom > 0);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas
        frameloop={visible ? "always" : "never"}
        dpr={mobile ? 1 : [1, 1.5]}
        gl={{ antialias: !mobile, alpha: false, powerPreference: "high-performance" }}
        camera={{ fov: 45, near: 0.1, far: 120, position: [0, 0, CAMERA_START] }}
        flat
        onCreated={({ scene, gl }) => {
          scene.background = new THREE.Color("#0a1912");
          scene.fog = new THREE.Fog("#d8cfc6", 8, 48);
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <Suspense fallback={null}>
          <World backdrop={backdrop} progress={progress} mobile={mobile} onReady={onReady} />
        </Suspense>
      </Canvas>
    </div>
  );
}
