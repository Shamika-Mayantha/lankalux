"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/components/motion/gsap";
import { Magnetic } from "@/components/motion/Magnetic";
import { useEnquiry } from "@/components/enquiry/Enquiry";
import type { HeroProgress } from "./HeroScene";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * The first screen holds while the camera flies through the foliage (about one and a half screens of scroll),
 * then releases into the page. The photograph underneath is the LCP image and the reduced-motion view.
 */
export function HomeHero({
  lines,
  lead,
  points,
  backdropSrc,
  poster,
}: {
  lines: string[];
  lead: string;
  points: string[];
  backdropSrc: string;
  poster: React.ReactNode;
}) {
  const root = useRef<HTMLElement>(null);
  const progress = useRef<HeroProgress>({ current: 0 }).current;
  const [use3d, setUse3d] = useState(false);
  const [ready, setReady] = useState(false);
  const enquire = useEnquiry();

  // The photograph is the first paint. The 3D scene starts on the visitor's first scroll, touch or
  // pointer movement (or after a few seconds), so it never competes with loading. Never under reduced motion.
  useEffect(() => {
    if (prefersReducedMotion() || !webglAvailable()) return;
    const events = ["pointermove", "pointerdown", "touchstart", "wheel", "scroll", "keydown"] as const;
    const start = () => {
      setUse3d(true);
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, start));
    };
    // Phones wait for the visitor; desktops also start on their own after a moment.
    const timer = window.matchMedia("(pointer: coarse)").matches ? undefined : setTimeout(start, 3000);
    events.forEach((e) => window.addEventListener(e, start, { passive: true, once: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, start));
    };
  }, []);

  const onReady = useCallback(() => setReady(true), []);

  useGSAP(
    () => {
      const el = root.current!;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            onUpdate: (st) => (progress.current = st.progress),
          },
          defaults: { ease: "none" },
        });
        tl.to("[data-hero-copy]", { yPercent: -14, autoAlpha: 0, duration: 0.16 }, 0.02)
          .fromTo("[data-hero-point]", { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, stagger: 0.12, duration: 0.16 }, 0.38)
          .to("[data-hero-point]", { autoAlpha: 0, y: -30, stagger: 0.04, duration: 0.12 }, 0.84)
          .to("[data-hero-fade]", { autoAlpha: 1, duration: 0.16 }, 0.84);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  // Lead and actions are painted immediately (they are the LCP text); they only settle upwards.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from("[data-hero-in]", { y: 22, duration: 1.4, stagger: 0.1, delay: 0.35 });
    },
    { scope: root },
  );

  useEffect(() => {
    if (ready) gsap.to(root.current!.querySelector("[data-hero-canvas]"), { autoAlpha: 1, duration: 1.6, ease: "power2.out" });
  }, [ready]);

  return (
    <section ref={root} aria-label="Introduction" className="relative h-[230svh] bg-forest-950 motion-reduce:h-svh">
      <div className="sticky top-0 h-svh overflow-hidden text-ivory">
        <div className="absolute inset-0">{poster}</div>
        {use3d && (
          <div data-hero-canvas className="invisible absolute inset-0 opacity-0">
            <HeroScene backdrop={backdropSrc} progress={progress} onReady={onReady} />
          </div>
        )}
        <div className="scrim-bottom pointer-events-none absolute inset-0" />
        <div data-hero-fade className="pointer-events-none invisible absolute inset-0 bg-forest-950 opacity-0" />

        <div data-hero-copy className="wrap relative flex h-full flex-col justify-end pb-[clamp(2.5rem,6vh,4.5rem)]">
          <h1 className="max-w-[16ch] text-display leading-[0.96]">
            {lines.map((l, i) => (
              <span key={l} data-split data-immediate data-delay={String(0.15 + i * 0.12)} className="block">
                {l}
              </span>
            ))}
          </h1>
          <div className="mt-8 grid gap-8 md:grid-cols-12 md:items-end">
            <p data-hero-in className="max-w-[46ch] text-[1.0625rem] text-ivory/90 md:col-span-6">
              {lead}
            </p>
            <div data-hero-in className="flex flex-wrap items-center gap-x-7 gap-y-4 md:col-span-6">
              <Magnetic>
                <button type="button" className="btn" onClick={() => enquire({ kind: "booking" })}>
                  Build my journey <span className="btn-arrow">→</span>
                </button>
              </Magnetic>
              <Link href="/journeys" className="link-arrow">
                Explore our journeys <span className="btn-arrow">→</span>
              </Link>
            </div>
          </div>
        </div>

        <ul aria-label="How we travel" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center motion-reduce:hidden">
          {points.map((p) => (
            <li key={p} data-hero-point className="invisible font-display text-title leading-[1.05] opacity-0">
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
