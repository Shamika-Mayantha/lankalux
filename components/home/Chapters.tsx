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

/** How small the photograph starts, as a share of the screen (a larger card on narrow phones). */
const CARD_SCALE = { wide: 0.42, phone: 0.68 };

/**
 * Culture → Hill Country → Wildlife → Coast. Each chapter holds the screen while its photograph
 * grows from a framed card to full bleed (a scaled window over a counter-scaled photo, so only
 * transforms move), then the title arrives and that part of the route draws on the island.
 * Phones get the same scene with a larger starting card and the island tucked in the top corner.
 */
export function Chapters({ chapters }: { chapters: Chapter[] }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ phone: "(max-width: 767px)", motion: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
        const { phone, motion } = ctx.conditions as { phone: boolean; motion: boolean };
        if (!motion) {
          // Reduced motion: each chapter is its full photograph with everything shown.
          gsap.set("[data-chapter-copy], [data-chapter-dim], [data-chapter-map]", { autoAlpha: 1 });
          gsap.set("[data-route-segment][data-current]", { strokeDashoffset: 0 });
          return;
        }
        const card = phone ? CARD_SCALE.phone : CARD_SCALE.wide;
        gsap.utils.toArray<HTMLElement>("[data-chapter]").forEach((ch) => {
          const frame = ch.querySelector("[data-frame]");
          const photo = ch.querySelector("[data-frame-photo]");
          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: { trigger: ch, start: "top top", end: "bottom bottom", scrub: 0.6 },
          });
          tl.fromTo(frame, { scale: card }, { scale: 1, duration: 0.5 }, 0)
            .fromTo(photo, { scale: (1 / card) * 1.08 }, { scale: 1.08, duration: 0.5 }, 0)
            .to(photo, { scale: 1, yPercent: -3, duration: 0.5 }, 0.5)
            .fromTo(ch.querySelectorAll("[data-extra]"), { yPercent: 40 }, { yPercent: -120, stagger: 0.06, duration: 0.5 }, 0)
            .to(ch.querySelectorAll("[data-extra]"), { autoAlpha: 0, duration: 0.12 }, 0.32)
            .fromTo(ch.querySelector("[data-chapter-dim]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 0.32)
            .fromTo(ch.querySelectorAll("[data-chapter-copy]"), { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, stagger: 0.05, duration: 0.18 }, 0.4)
            .fromTo(ch.querySelector("[data-chapter-map]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12 }, 0.42)
            .fromTo(ch.querySelector("[data-route-segment][data-current]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.35 }, 0.48);
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root}>
      {chapters.map((c, i) => (
        <article key={c.key} data-chapter aria-labelledby={`chapter-${c.key}`} className="relative h-[210svh] md:h-[230svh] motion-reduce:h-auto">
          <div className="sticky top-0 h-svh overflow-hidden bg-paper motion-reduce:relative">
            {/* The photograph: a card that becomes the whole screen. */}
            <div data-frame className="absolute inset-0 overflow-hidden will-change-transform">
              <div data-frame-photo className="absolute inset-x-0 top-0 -bottom-[5%] will-change-transform">
                <Photo photo={c.main} sizes="(min-width: 768px) 100vw, 140vw" />
              </div>
            </div>
            <div data-chapter-dim className="invisible absolute inset-0 opacity-0">
              <div className="scrim-bottom absolute inset-0" />
              {/* Phones carry the whole description over the photo, so it is dimmed a little more. */}
              <div className="absolute inset-0 bg-forest-950/30 md:hidden" />
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

            <div className="wrap absolute inset-0 flex flex-col justify-end pb-[clamp(2.5rem,7vh,5rem)] text-ivory">
              <div className="grid items-end gap-8 md:grid-cols-12">
                <div className="md:col-span-8">
                  <h3 id={`chapter-${c.key}`} data-chapter-copy className="invisible text-display leading-[0.95] opacity-0">
                    {c.title}
                  </h3>
                  <p data-chapter-copy className="invisible mt-5 max-w-[54ch] text-ivory/90 opacity-0 max-md:text-[1rem] max-md:leading-[1.5] md:mt-6">
                    {c.description}
                  </p>
                  <div data-chapter-copy className="invisible mt-6 opacity-0 md:mt-8">
                    <Link href={c.href} className="link-arrow">
                      {c.linkLabel} <span className="btn-arrow">→</span>
                    </Link>
                  </div>
                </div>
                <div
                  data-chapter-map
                  className="invisible absolute right-[var(--spacing-gutter)] top-[calc(var(--header-h)+0.75rem)] flex justify-end opacity-0 md:relative md:right-auto md:top-auto md:col-span-4"
                >
                  <RouteMap
                    segments={SEGMENTS.slice(0, i + 1)}
                    drawn={i}
                    labels={LABELS[i]}
                    labelSize={30}
                    currentSegment={i}
                    className="h-[19svh] w-auto md:h-[min(44vh,22rem)]"
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
