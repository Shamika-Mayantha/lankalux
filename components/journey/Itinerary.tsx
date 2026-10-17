"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/components/motion/gsap";
import { Photo } from "@/components/ui/Photo";
import type { Photo as PhotoData } from "@/lib/photos";
import { MAP_OUTLINE, MAP_VIEWBOX, PLACE_NAMES, place, routePath, type Place } from "@/lib/route";

export type ItineraryDay = { day: number; title: string; body: string[]; highlights: string[]; photo: PhotoData };
type DayRoute = { path?: Place[]; stay: Place };

/**
 * The day-by-day. The island stays pinned beside the days; as each day scrolls through the middle
 * of the screen its stretch of road draws in gold and the place it ends in lights up.
 * On phones the map sits in a slim bar above the days.
 */
export function Itinerary({ days, routes }: { days: ItineraryDay[]; routes: DayRoute[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  // Overnight stops only; towns the road merely passes through are part of the line.
  const stops = Array.from(new Set(routes.map((r) => r.stay)));
  const activeStay = routes[active]?.stay;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      const blocks = gsap.utils.toArray<HTMLElement>("[data-day]");

      blocks.forEach((block, i) => {
        // Which day is current: the one crossing the middle of the screen.
        gsap.timeline({
          scrollTrigger: {
            trigger: block,
            start: "top 55%",
            end: "bottom 55%",
            onToggle: (st) => st.isActive && setActive(i),
          },
        });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        blocks.forEach((block, i) => {
          const segs = root.current!.querySelectorAll(`[data-day-path="${i}"]`);
          if (segs.length)
            gsap.fromTo(segs, { strokeDashoffset: 1 }, {
              strokeDashoffset: 0,
              ease: "none",
              scrollTrigger: { trigger: block, start: "top 80%", end: "top 30%", scrub: 0.5 },
            });
        });
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-day-path]", { strokeDashoffset: 0 });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const map = (labels: boolean, className: string) => (
    <svg viewBox={MAP_VIEWBOX} className={className} fill="none" aria-hidden="true">
      <path d={MAP_OUTLINE} fill="var(--color-ivory)" fillOpacity={0.06} stroke="var(--color-ivory)" strokeOpacity={0.5} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
      {/* The whole route, faint, so the shape of the journey is visible from the start. */}
      {routes.map((r, i) =>
        r.path ? (
          <path key={"ghost" + i} d={routePath(r.path)} stroke="var(--color-ivory)" strokeOpacity={0.22} strokeWidth={1.4} strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
        ) : null,
      )}
      {routes.map((r, i) =>
        r.path ? (
          <path
            key={i}
            data-day-path={i}
            d={routePath(r.path)}
            stroke="var(--color-gold)"
            strokeWidth={2.6}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={1}
            vectorEffect="non-scaling-stroke"
          />
        ) : null,
      )}
      {stops.map((p) => {
        const [x, y] = place(p);
        const on = p === activeStay;
        return (
          <g key={p} className="transition-opacity duration-500" opacity={on ? 1 : 0.55}>
            {on && <circle cx={x} cy={y} r={14} fill="var(--color-gold)" fillOpacity={0.25} className="origin-center animate-pulse [transform-box:fill-box]" />}
            <circle cx={x} cy={y} r={on ? 6.5 : 4.5} fill={on ? "var(--color-gold)" : "var(--color-ivory)"} />
            {labels && on && (
              <text x={x + 14} y={y + 7} fill="var(--color-ivory)" fontSize={22} fontFamily="var(--font-sans)" fontWeight={500}>
                {PLACE_NAMES[p]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );

  return (
    <div ref={root} className="relative bg-paper lg:grid lg:grid-cols-12">
      {/* Map: pinned left column on large screens, slim sticky bar on phones. */}
      <div className="sticky top-0 z-[2] bg-forest-900 text-ivory lg:col-span-5 lg:h-svh lg:self-start">
        <div className="flex h-[21svh] items-center gap-5 px-[var(--spacing-gutter)] pt-[var(--header-h)] lg:hidden">
          {map(false, "h-full w-auto py-2")}
          <p className="min-w-0">
            <span className="block text-[0.875rem] text-mist">Day {days[active]?.day}</span>
            <span className="block truncate font-display text-[1.5rem] leading-tight">{PLACE_NAMES[activeStay!]}</span>
          </p>
        </div>
        <div className="hidden h-full flex-col justify-between px-[clamp(2rem,4vw,4rem)] pb-10 pt-[calc(var(--header-h)+2rem)] lg:flex">
          <div className="flex items-baseline justify-between gap-6">
            <p className="font-display text-[clamp(2.5rem,4vw,4rem)] leading-none tabular-nums">Day {days[active]?.day}</p>
            <p className="text-right text-mist">
              {days.length} days · {PLACE_NAMES[activeStay!]}
            </p>
          </div>
          {map(true, "mx-auto h-[min(66svh,44rem)] w-auto")}
        </div>
      </div>

      <ol className="lg:col-span-7">
        {days.map((d, i) => (
          <li key={d.day} data-day={i} className="wrap grid gap-8 py-[clamp(4rem,10vh,7rem)] lg:min-h-svh lg:content-center lg:px-[clamp(2rem,5vw,5rem)]">
            <div data-clip className="relative aspect-[16/10] overflow-hidden">
              <Photo photo={d.photo} sizes="(min-width: 1024px) 52vw, 100vw" />
            </div>
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] md:gap-10">
              <div>
                <p data-reveal className="text-[0.95rem] font-medium text-forest-700">Day {d.day}</p>
                <h2 data-split className="mt-2 text-[clamp(2rem,3.2vw,3.25rem)] leading-[1.02]">
                  {d.title}
                </h2>
                {d.body.map((p) => (
                  <p key={p} data-reveal className="mt-5 text-ink-soft">
                    {p}
                  </p>
                ))}
              </div>
              {d.highlights.length > 0 && (
                <div data-reveal className="md:pt-9">
                  <p className="font-display text-[1.25rem]">Highlights</p>
                  <ul className="mt-3 space-y-2 text-[1rem]">
                    {d.highlights.map((h) => (
                      <li key={h} className="flex gap-3">
                        <span aria-hidden="true" className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-gold" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
