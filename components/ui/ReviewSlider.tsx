"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/components/motion/gsap";
import type { Review } from "@/lib/site-content";

const INTERVAL = 6000;

/**
 * One guest's words at a time, set large, rotating on their own every few seconds while on screen.
 * A pause button stops it (moving content must be pausable); every review stays in the DOM.
 */
export function ReviewSlider({ reviews, tone = "light" }: { reviews: Review[]; tone?: "light" | "dark" }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const progress = useRef<gsap.core.Tween | null>(null);
  const count = reviews.length;

  // The progress line runs for one interval, then the next review comes in.
  useEffect(() => {
    if (count < 2 || !bar.current) return;
    progress.current?.kill();
    progress.current = gsap.fromTo(
      bar.current,
      { scaleX: 0 },
      { scaleX: 1, duration: INTERVAL / 1000, ease: "none", paused: !playing, onComplete: () => setIndex((i) => (i + 1) % count) },
    );
    return () => void progress.current?.kill();
  }, [index, count, playing]);

  // Only run while the section is on screen.
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (!progress.current) return;
      if (e.isIntersecting && playing) progress.current.play();
      else progress.current.pause();
    });
    io.observe(root.current!);
    return () => io.disconnect();
  }, [playing, index]);

  useEffect(() => {
    const el = root.current?.querySelector<HTMLElement>(`[data-review="${index}"]`);
    if (el && !prefersReducedMotion()) gsap.fromTo(el.querySelectorAll("[data-review-part]"), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.9 });
  }, [index]);

  const go = (d: number) => setIndex((i) => (i + d + count) % count);
  const soft = tone === "light" ? "text-ivory/75" : "text-ink-soft";

  return (
    <div ref={root} aria-roledescription="carousel" aria-label="Guest reviews">
      <div className="grid" aria-live={playing ? "off" : "polite"}>
        {reviews.map((r, i) => (
          <figure
            key={i}
            data-review={i}
            aria-hidden={i !== index}
            className={`col-start-1 row-start-1 transition-opacity duration-700 ${i === index ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            <blockquote data-review-part className="max-w-[34ch] font-display text-statement leading-[1.25]">
              “{r.quote}”
            </blockquote>
            <figcaption data-review-part className={`mt-6 ${soft}`}>
              {r.author}
            </figcaption>
          </figure>
        ))}
      </div>
      {count > 1 && (
        <div className="mt-10">
          <span aria-hidden="true" className="block h-[2px] w-full max-w-[22rem] bg-current/20">
            <span ref={bar} className="block h-full origin-left scale-x-0 bg-gold" />
          </span>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <button type="button" onClick={() => go(-1)} className="link-arrow" aria-label="Previous review">
              ← Previous
            </button>
            <span className={`text-[0.95rem] tabular-nums ${soft}`}>
              {index + 1} of {count}
            </span>
            <button type="button" onClick={() => go(1)} className="link-arrow" aria-label="Next review">
              Next →
            </button>
            <button type="button" onClick={() => setPlaying((p) => !p)} className={`link-arrow ${soft}`} aria-pressed={!playing}>
              {playing ? "Pause" : "Play"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
