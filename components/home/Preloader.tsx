"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/components/motion/gsap";
import { MAP_OUTLINE, MAP_VIEWBOX } from "@/lib/route";

/**
 * First visit to the homepage in a session: the island's coastline draws itself in gold while
 * the hero loads, then the screen lifts. Shown only when the boot script set data-hold-enter.
 */
export function Preloader() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const el = root.current!;
    if (html.dataset.holdEnter !== "preloader") {
      el.style.display = "none";
      return;
    }
    const count = el.querySelector<HTMLElement>("[data-count]")!;
    const counter = { v: 0 };
    const loaded = new Promise<void>((resolve) => {
      const done = () => resolve();
      if (document.readyState === "complete") done();
      else window.addEventListener("load", done, { once: true });
      setTimeout(done, 2400);
    });
    const fonts = document.fonts?.ready ?? Promise.resolve();

    const intro = gsap.timeline();
    intro
      .fromTo(el.querySelector("[data-coast]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.5, ease: "luxInOut" })
      .fromTo(el.querySelector("[data-word]"), { yPercent: 110 }, { yPercent: 0, duration: 1.1 }, 0.3)
      .to(counter, { v: 86, duration: 1.8, ease: "power2.out", onUpdate: () => (count.textContent = String(Math.round(counter.v))) }, 0);

    let cancelled = false;
    Promise.all([loaded, fonts, new Promise((r) => setTimeout(r, 1300))]).then(() => {
      if (cancelled) return;
      gsap
        .timeline({
          onComplete: () => {
            try {
              sessionStorage.setItem("lux-preloaded", "1");
            } catch {}
            html.classList.remove("preload");
            el.style.display = "none";
          },
        })
        .to(counter, { v: 100, duration: 0.4, onUpdate: () => (count.textContent = String(Math.round(counter.v))) })
        .to(el.querySelectorAll("[data-pre-fade]"), { autoAlpha: 0, y: -20, duration: 0.5, stagger: 0.05 })
        .to(el, { yPercent: -100, duration: 1.1, ease: "luxInOut" }, "-=0.15")
        .add(() => {
          delete html.dataset.holdEnter;
          window.dispatchEvent(new CustomEvent("lux:enter", { detail: location.pathname }));
        }, "-=0.75");
    });
    return () => {
      cancelled = true;
      intro.kill();
    };
  }, []);

  return (
    <div
      ref={root}
      aria-hidden="true"
      className="lux-preloader fixed inset-0 flex flex-col items-center justify-center bg-forest-950 text-ivory"
      style={{ zIndex: "var(--z-curtain)" }}
    >
      <svg data-pre-fade viewBox={MAP_VIEWBOX} className="h-[min(38vh,18rem)] w-auto" fill="none">
        <path data-coast d={MAP_OUTLINE} stroke="var(--color-gold)" strokeWidth={1.4} pathLength={1} strokeDasharray="1" strokeDashoffset="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <div data-pre-fade className="mt-10 overflow-clip">
        <span data-word className="block font-display text-[clamp(2.5rem,6vw,4.5rem)] uppercase leading-none tracking-[0.14em]">
          LankaLux
        </span>
      </div>
      <span data-pre-fade className="absolute bottom-8 right-[var(--spacing-gutter)] font-display text-[2rem] tabular-nums text-mist">
        <span data-count>0</span>
      </span>
    </div>
  );
}
