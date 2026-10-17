"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP } from "@/components/motion/gsap";

/**
 * The four journeys as cards that pin one over another: each recedes a little as the next arrives.
 * Phones and reduced motion get a plain stack.
 */
export function JourneyStack({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const cards = gsap.utils.toArray<HTMLElement>("[data-stack-card]");
        cards.forEach((card, i) => {
          const next = cards[i + 1];
          if (!next) return;
          gsap.to(card.querySelector("[data-stack-inner]"), {
            scale: 0.9,
            yPercent: -4,
            ease: "none",
            scrollTrigger: { trigger: next, start: "top bottom", end: "top top", scrub: true },
          });
          gsap.to(card.querySelector("[data-stack-shade]"), {
            autoAlpha: 0.6,
            ease: "none",
            scrollTrigger: { trigger: next, start: "top bottom", end: "top top", scrub: true },
          });
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className="bg-forest-950">
      {children}
    </div>
  );
}

export function StackCard({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <article data-stack-card className="relative lg:sticky lg:top-0 lg:h-svh">
      <Link href={href} className="group block h-full">
        <div data-stack-inner className="relative h-[86svh] origin-top overflow-hidden bg-forest-950 text-ivory lg:h-full">
          {children}
          <div data-stack-shade className="pointer-events-none absolute inset-0 bg-forest-950 opacity-0" />
        </div>
      </Link>
    </article>
  );
}
