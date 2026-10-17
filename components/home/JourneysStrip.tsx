"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP } from "@/components/motion/gsap";
import { Photo } from "@/components/ui/Photo";
import type { Photo as PhotoData } from "@/lib/photos";

export type JourneyCard = { href: string; tag: string; title: string; desc: string; photo: PhotoData };

/**
 * "Need somewhere to start?" On large screens the four journeys travel sideways while the
 * section holds; on phones and under reduced motion they stack.
 */
export function JourneysStrip({ title, intro, journeys }: { title: string; intro: string; journeys: JourneyCard[] }) {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const el = track.current!;
        const distance = () => el.scrollWidth - window.innerWidth;
        const tween = gsap.to(el, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: () => "+=" + distance(),
            pin: true,
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
        gsap.utils.toArray<HTMLElement>("[data-strip-photo]").forEach((p) => {
          gsap.fromTo(p, { xPercent: -8 }, {
            xPercent: 8,
            ease: "none",
            scrollTrigger: { trigger: p, containerAnimation: tween, start: "left right", end: "right left", scrub: true },
          });
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id="journeys" aria-labelledby="journeys-title" className="overflow-hidden bg-forest-900 text-ivory">
      <div ref={track} className="flex flex-col gap-16 py-section lg:h-svh lg:flex-row lg:items-center lg:gap-[3vw] lg:py-0 lg:pl-[var(--spacing-gutter)] lg:pr-[8vw]">
        <div className="wrap shrink-0 lg:w-[34vw] lg:px-0">
          <h2 id="journeys-title" data-split className="text-title">
            {title}
          </h2>
          <div data-reveal className="prose-lux mt-8 text-mist [&_a]:text-ivory" dangerouslySetInnerHTML={{ __html: intro }} />
        </div>

        {journeys.map((j) => (
          <Link
            key={j.href}
            href={j.href}
            className="group relative mx-[var(--spacing-gutter)] block shrink-0 lg:mx-0 lg:h-[78svh] lg:w-[min(58vw,64rem)]"
          >
            <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[16/10] lg:aspect-auto lg:h-full" data-clip>
              <div data-strip-photo className="absolute -inset-x-[10%] inset-y-0">
                <Photo photo={j.photo} sizes="(min-width: 1024px) 64vw, (min-width: 640px) 100vw, 190vw" className="transition-transform duration-[1.4s] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]" />
              </div>
              <div className="scrim-bottom absolute inset-0" />
              <div className="absolute inset-x-0 bottom-0 p-[clamp(1.25rem,3vw,2.75rem)]">
                <p className="text-[0.95rem] text-gold">{j.tag}</p>
                <h3 className="mt-3 max-w-[16ch] text-title leading-[0.98]">{j.title}</h3>
                <p className="mt-4 max-w-[46ch] text-ivory/90">{j.desc}</p>
                <span className="link-arrow mt-6">
                  Explore this journey <span className="btn-arrow">→</span>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
