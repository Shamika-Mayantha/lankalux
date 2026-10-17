"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, isCoarsePointer, useGSAP } from "@/components/motion/gsap";
import { Magnetic } from "@/components/motion/Magnetic";
import { useEnquiry } from "@/components/enquiry/Enquiry";

/**
 * The journey's opening: its photograph at the back, palm fronds in the foreground, the title
 * between them. Layers move at different speeds with the scroll and, on desktop, the pointer.
 */
export function JourneyHero({
  title,
  lead,
  facts,
  photo,
}: {
  title: string;
  lead: string;
  facts: { label: string; value: string }[];
  photo: React.ReactNode;
}) {
  const root = useRef<HTMLElement>(null);
  const enquire = useEnquiry();

  useGSAP(
    (_, contextSafe) => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const st = { trigger: root.current, start: "top top", end: "bottom top", scrub: true };
        gsap.to("[data-layer='back']", { yPercent: 18, scale: 1.08, ease: "none", scrollTrigger: st });
        gsap.to("[data-layer='mid']", { yPercent: -10, autoAlpha: 0, ease: "none", scrollTrigger: { ...st, end: "60% top" } });
        gsap.to("[data-layer='front']", { yPercent: -35, ease: "none", scrollTrigger: st });
        gsap.from("[data-layer='front']", { yPercent: 30, autoAlpha: 0, duration: 2, delay: 0.3 });
        gsap.from("[data-layer='back']", { scale: 1.18, duration: 2.6, ease: "lux" });

        if (isCoarsePointer() || !contextSafe) return;
        const layers = [
          { el: "[data-depth='back']", d: 12 },
          { el: "[data-depth='front']", d: 38 },
        ].map((l) => ({ x: gsap.quickTo(l.el, "x", { duration: 1.2 }), y: gsap.quickTo(l.el, "y", { duration: 1.2 }), d: l.d }));
        const move = contextSafe((e: PointerEvent) => {
          const nx = e.clientX / window.innerWidth - 0.5;
          const ny = e.clientY / window.innerHeight - 0.5;
          layers.forEach((l) => {
            l.x(-nx * l.d);
            l.y(-ny * l.d);
          });
        });
        window.addEventListener("pointermove", move, { passive: true });
        return () => window.removeEventListener("pointermove", move);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative flex min-h-svh flex-col justify-end overflow-hidden bg-forest-950 text-ivory">
      <div data-depth="back" className="absolute -inset-[3%]">
        <div data-layer="back" className="absolute inset-0">
          {photo}
        </div>
      </div>
      <div className="scrim-bottom absolute inset-0" />
      <div className="absolute inset-0 bg-forest-950/15" />

      <div data-layer="mid" className="wrap relative z-[1] pb-[clamp(2.5rem,7vh,5rem)] pt-40">
        <h1 data-split data-immediate className="max-w-[14ch] text-display leading-[0.95]">
          {title}
        </h1>
        <div className="mt-8 grid gap-10 md:grid-cols-12 md:items-end">
          <p data-reveal data-immediate data-delay="0.4" className="max-w-[44ch] text-[1.0625rem] text-ivory/90 md:col-span-5">
            {lead}
          </p>
          <dl data-reveal-group data-immediate data-delay="0.5" className="flex flex-wrap gap-x-10 gap-y-4 md:col-span-4">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="text-[0.875rem] text-ivory/70">{f.label}</dt>
                <dd className="font-display text-[1.75rem] leading-tight">{f.value}</dd>
              </div>
            ))}
          </dl>
          <div data-reveal data-immediate data-delay="0.6" className="md:col-span-3 md:justify-self-end">
            <Magnetic>
              <button type="button" className="btn" onClick={() => enquire({ kind: "journey", journey: title })}>
                Reserve or tailor this journey <span className="btn-arrow">→</span>
              </button>
            </Magnetic>
          </div>
        </div>
      </div>

      {/* Foreground fronds, cut off by the bottom and right edges as the cut-out is. */}
      <div data-depth="front" aria-hidden="true" className="pointer-events-none absolute -bottom-[6%] -right-[12%] w-[min(62vw,58rem)] max-md:hidden">
        <div data-layer="front">
          <Image src="/media/3d/fronds.webp" alt="" width={2048} height={1157} sizes="62vw" className="h-auto w-full brightness-[0.45]" />
        </div>
      </div>
    </section>
  );
}
