"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP } from "@/components/motion/gsap";
import { Photo } from "@/components/ui/Photo";
import { RouteMap } from "@/components/ui/RouteMap";
import type { Photo as PhotoData } from "@/lib/photos";
import type { Place } from "@/lib/route";

export type Chapter = {
  key: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  main: PhotoData;
  extras: PhotoData[];
};

// The island loop the four chapters draw, one segment each.
const SEGMENTS: Place[][] = [
  ["airport", "sigiriya", "polonnaruwa", "kandy"],
  ["kandy", "nuwaraEliya", "ella"],
  ["ella", "yala"],
  ["yala", "mirissa", "galle", "colombo"],
];
const LABELS: Place[][] = [["sigiriya", "kandy"], ["nuwaraEliya", "ella"], ["yala"], ["galle"]];

const CARD_SCALE = 0.42;

/**
 * Culture → Hill Country → Wildlife → Coast. Each chapter holds the screen while its photograph
 * grows from a framed card to full bleed (a scaled window over a counter-scaled photo, so only
 * transforms move), then the title arrives and that part of the route draws on the island.
 */
export function Chapters({ chapters }: { chapters: Chapter[] }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>("[data-chapter]").forEach((ch) => {
          const frame = ch.querySelector("[data-frame]");
          const photo = ch.querySelector("[data-frame-photo]");
          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: { trigger: ch, start: "top top", end: "bottom bottom", scrub: 0.6 },
          });
          tl.fromTo(frame, { scale: CARD_SCALE }, { scale: 1, duration: 0.5 }, 0)
            .fromTo(photo, { scale: (1 / CARD_SCALE) * 1.08 }, { scale: 1.08, duration: 0.5 }, 0)
            .to(photo, { scale: 1, yPercent: -3, duration: 0.5 }, 0.5)
            .fromTo(ch.querySelectorAll("[data-extra]"), { yPercent: 40 }, { yPercent: -120, stagger: 0.06, duration: 0.5 }, 0)
            .to(ch.querySelectorAll("[data-extra]"), { autoAlpha: 0, duration: 0.12 }, 0.32)
            .fromTo(ch.querySelector("[data-chapter-dim]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 0.32)
            .fromTo(ch.querySelectorAll("[data-chapter-copy]"), { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, stagger: 0.05, duration: 0.18 }, 0.4)
            .fromTo(ch.querySelector("[data-chapter-map]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12 }, 0.42)
            .fromTo(ch.querySelector("[data-route-segment][data-current]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.35 }, 0.48);
        });
      });
      // Phones and reduced motion: no pinning. Photos open as they arrive; the route shows fully drawn.
      mm.add("(max-width: 767px), (prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-route-segment][data-current]", { strokeDashoffset: 0 });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root}>
      {chapters.map((c, i) => (
        <article key={c.key} data-chapter aria-labelledby={`chapter-${c.key}`} className="relative md:h-[230svh] motion-reduce:h-auto">
          <div className="relative overflow-hidden bg-paper md:sticky md:top-0 md:h-svh motion-reduce:static">
            {/* The photograph: a card that becomes the whole screen. */}
            <div className="relative h-[78svh] md:absolute md:inset-0 md:h-auto">
              <div data-frame data-clip className="absolute inset-0 overflow-hidden will-change-transform">
                <div data-frame-photo className="absolute inset-0 will-change-transform">
                  <Photo photo={c.main} sizes="(min-width: 768px) 100vw, 140vw" />
                </div>
              </div>
              <div data-chapter-dim className="scrim-bottom absolute inset-0 md:invisible md:opacity-0" />
            </div>

            {/* Two smaller photographs drift past the card at a different depth. */}
            {c.extras.map((x, j) => (
              <div
                key={x.key}
                data-extra
                aria-hidden="true"
                className={`absolute hidden aspect-[4/5] w-[15vw] overflow-hidden md:block ${j === 0 ? "left-[8vw] top-[58%]" : "right-[9vw] top-[30%]"}`}
              >
                <Photo photo={x} sizes="16vw" frameAspect={0.8} />
              </div>
            ))}

            <div className="wrap relative flex flex-col justify-end bg-forest-950 pb-14 pt-10 text-ivory md:absolute md:inset-0 md:bg-transparent md:pb-[clamp(2.5rem,7vh,5rem)]">
              <div className="grid items-end gap-8 md:grid-cols-12">
                <div className="md:col-span-8">
                  <h3 id={`chapter-${c.key}`} data-chapter-copy className="text-display leading-[0.95] md:invisible md:opacity-0">
                    {c.title}
                  </h3>
                  <p data-chapter-copy className="mt-6 max-w-[54ch] text-ivory/90 md:invisible md:opacity-0">
                    {c.description}
                  </p>
                  <div data-chapter-copy className="mt-8 md:invisible md:opacity-0">
                    <Link href={c.href} className="link-arrow">
                      {c.linkLabel} <span className="btn-arrow">→</span>
                    </Link>
                  </div>
                </div>
                <div data-chapter-map className="hidden justify-end md:col-span-4 md:flex md:invisible md:opacity-0">
                  <RouteMap
                    segments={SEGMENTS.slice(0, i + 1)}
                    drawn={i}
                    labels={LABELS[i]}
                    labelSize={30}
                    currentSegment={i}
                    className="h-[min(44vh,22rem)] w-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
