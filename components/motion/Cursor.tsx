"use client";

import { useEffect, useRef } from "react";
import { gsap, isCoarsePointer, prefersReducedMotion } from "./gsap";

/** A small ring that trails the pointer and opens over links. Desktop pointers only. */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ring.current;
    if (!el || isCoarsePointer() || prefersReducedMotion()) return;
    document.documentElement.classList.add("has-cursor");
    const xTo = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });
    let shown = false;
    let hovering: Element | null = null;

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (!shown) {
        gsap.set(el, { x: e.clientX, y: e.clientY });
        gsap.to(el, { autoAlpha: 1, duration: 0.3 });
        shown = true;
      }
      xTo(e.clientX);
      yTo(e.clientY);
      const target = (e.target as Element | null)?.closest?.("a, button, [data-cursor], summary, label, input, select, textarea");
      if (target === hovering) return;
      hovering = target ?? null;
      const field = target?.matches("input, select, textarea");
      gsap.to(el, { scale: field ? 0.4 : target ? 2.2 : 1, duration: 0.45, ease: "power3.out" });
    };
    const leave = () => {
      shown = false;
      gsap.to(el, { autoAlpha: 0, duration: 0.3 });
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      document.documentElement.classList.remove("has-cursor");
    };
  }, []);

  return (
    <div
      ref={ring}
      aria-hidden="true"
      className="lux-cursor pointer-events-none fixed left-0 top-0 hidden size-5 rounded-full border border-ivory mix-blend-difference md:flex"
      style={{ zIndex: "var(--z-cursor)", visibility: "hidden", marginLeft: "-0.625rem", marginTop: "-0.625rem" }}
    />
  );
}
