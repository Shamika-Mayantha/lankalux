"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/components/motion/gsap";

/**
 * "Your itinerary is a plan, not a rulebook." The "Maybe…" lines arrive one by one
 * while the section holds over a darkened photograph.
 */
export function PlanNotRulebook({ title, paragraphs, background }: { title: string; paragraphs: string[]; background: React.ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const maybes = paragraphs.filter((p) => p.startsWith("Maybe"));
  const rest = paragraphs.filter((p) => !p.startsWith("Maybe"));

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 0.6 },
        });
        tl.fromTo("[data-maybe]", { autoAlpha: 0.12 }, { autoAlpha: 1, stagger: 0.2, duration: 0.2 }, 0.05)
          .fromTo("[data-plan-rest]", { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.2 }, 0.85)
          .fromTo("[data-plan-bg]", { scale: 1.12 }, { scale: 1, duration: 1 }, 0);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id="flexibility" aria-labelledby="flex-title" className="relative h-[240svh] bg-forest-950 text-ivory motion-reduce:h-auto">
      <div className="sticky top-0 flex min-h-svh items-center overflow-hidden motion-reduce:static">
        <div data-plan-bg className="photo-dim absolute inset-0">
          {background}
        </div>
        <div className="absolute inset-0 bg-forest-950/55" />
        <div className="wrap relative grid gap-12 py-24 lg:grid-cols-12">
          <h2 id="flex-title" data-split className="text-title lg:col-span-5">
            {title}
          </h2>
          <div className="lg:col-span-6 lg:col-start-7">
            <ul className="space-y-3">
              {maybes.map((m) => (
                <li key={m} data-maybe className="font-display text-statement leading-[1.2]">
                  {m}
                </li>
              ))}
            </ul>
            {rest.map((p) => (
              <p key={p} data-plan-rest className="mt-10 max-w-[52ch] text-ivory/90">
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
