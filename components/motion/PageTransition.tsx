"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "./gsap";
import { scrollToTarget, useLenis } from "./SmoothScroll";

const enter = (path: string) => {
  delete document.documentElement.dataset.holdEnter;
  window.dispatchEvent(new CustomEvent("lux:enter", { detail: path }));
};

/**
 * Route changes pass behind a forest-green curtain that carries the wordmark and a gold
 * route line. Every same-site link is handled here, including links inside page copy.
 */
export function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const lenis = useLenis();
  const curtain = useRef<HTMLDivElement>(null);
  const pendingHash = useRef<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || /\.(xml|txt|pdf|jpe?g|png|webp)$/i.test(url.pathname)) return;
      e.preventDefault();

      if (url.pathname === location.pathname) {
        if (url.hash) history.replaceState(null, "", url.hash);
        // Close the menu first: it holds Lenis stopped, so wait for it to let go before scrolling.
        window.dispatchEvent(new Event("lux:navigate"));
        const target = url.hash || 0;
        const scroll = (frames = 0) => (lenis?.isStopped && frames < 90 ? requestAnimationFrame(() => scroll(frames + 1)) : scrollToTarget(lenis, target));
        scroll();
        return;
      }
      if (busy.current) return;
      window.dispatchEvent(new Event("lux:navigate"));
      pendingHash.current = url.hash || null;
      const go = () => router.push(url.pathname + url.search, { scroll: false });

      if (prefersReducedMotion() || !curtain.current) {
        go();
        return;
      }
      busy.current = true;
      document.documentElement.dataset.holdEnter = "1";
      lenis?.stop();
      const el = curtain.current;
      gsap
        .timeline({ onComplete: go })
        .set(el, { visibility: "visible", yPercent: 100 })
        .to(el, { yPercent: 0, duration: 0.75, ease: "luxInOut" })
        .fromTo(el.querySelector("[data-curtain-mark]"), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.35)
        .fromTo(el.querySelector("[data-curtain-line]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, ease: "luxInOut" }, 0.25);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [lenis, router]);

  // The new page has rendered behind the curtain: reset scroll, then lift it.
  useEffect(() => {
    const hash = pendingHash.current;
    pendingHash.current = null;
    scrollToTarget(lenis, 0, true);
    ScrollTrigger.refresh();

    if (!busy.current) {
      if (hash) requestAnimationFrame(() => scrollToTarget(lenis, hash, true));
      if (document.documentElement.dataset.holdEnter !== "preloader") enter(pathname);
      return;
    }
    const el = curtain.current!;
    lenis?.start();
    const tl = gsap.timeline({
      delay: 0.12,
      onComplete: () => {
        gsap.set(el, { visibility: "hidden" });
        busy.current = false;
      },
    });
    tl.to(el.querySelector("[data-curtain-mark]"), { autoAlpha: 0, y: -16, duration: 0.4 })
      .to(el, { yPercent: -100, duration: 0.95, ease: "luxInOut" }, 0.1)
      .add(() => {
        if (hash) scrollToTarget(lenis, hash, true);
        enter(pathname);
      }, 0.45);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div
      ref={curtain}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 flex flex-col items-center justify-center bg-forest-900 text-ivory"
      style={{ zIndex: "var(--z-curtain)", visibility: "hidden" }}
    >
      <span data-curtain-mark className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-none tracking-[-0.03em]">
        LankaLux
      </span>
      <svg className="mt-8 h-6 w-[min(22rem,60vw)]" viewBox="0 0 300 20" fill="none" preserveAspectRatio="none">
        <path
          data-curtain-line
          d="M2 14 C 60 2, 110 18, 160 9 S 250 4, 298 12"
          stroke="var(--color-gold)"
          strokeWidth="1.5"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
