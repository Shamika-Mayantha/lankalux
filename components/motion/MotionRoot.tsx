"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "./gsap";

/**
 * Page-wide reveal system, driven by data attributes so server components stay server components:
 *   data-split            heading lines rise out of a mask
 *   data-reveal           element rises and fades in (data-delay="0.2")
 *   data-reveal-group     its children cascade in
 *   data-clip             a photo frame opens from the bottom while the photo settles
 *   data-parallax="0.12"  the element drifts against the scroll (fraction of its height)
 *   data-immediate        on the first screen: animate on page entry, not on scroll
 *
 * It runs after every route change, once the page curtain has lifted ("lux:enter").
 */
export function MotionRoot() {
  const pathname = usePathname();
  const [entered, setEntered] = useState<string | null>(null);

  useEffect(() => {
    const onEnter = (e: Event) => setEntered((e as CustomEvent<string>).detail ?? location.pathname);
    window.addEventListener("lux:enter", onEnter);
    // No curtain or preloader is holding this page back.
    if (!document.documentElement.dataset.holdEnter) setEntered(location.pathname);
    return () => window.removeEventListener("lux:enter", onEnter);
  }, [pathname]);

  useGSAP(
    (_, contextSafe) => {
      const html = document.documentElement;
      html.classList.add("motion-ready");
      if (entered !== pathname || !html.classList.contains("motion")) return;
      const main = document.getElementById("main");
      if (!main) return;
      const run = (near: boolean) => {
        try {
          setup(main, near);
        } catch (err) {
          console.error("Motion setup failed; showing content without animation.", err);
          html.classList.remove("motion");
        }
      };
      // What is on (or just below) the first screen is prepared now; the rest of the page when idle.
      run(true);
      const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
      const cancel = window.cancelIdleCallback ?? window.clearTimeout;
      const id = idle(contextSafe!(() => run(false)), { timeout: 1500 });
      return () => cancel(id);
    },
    { dependencies: [pathname, entered], revertOnUpdate: true },
  );

  return null;
}

/** Builds every reveal inside <main>; runs inside the useGSAP context so a route change reverts it all. */
function setup(main: HTMLElement, near: boolean) {
  const limit = window.innerHeight * 1.6;
  // Each pass takes the elements on its side of `limit`. Anything not rendered at this breakpoint
  // (display: none) is shown as-is, not animated, so it is visible if the window is resized later.
  const q = <T extends Element = HTMLElement>(sel: string) =>
    Array.from(main.querySelectorAll<T>(sel)).filter((el) => {
      if (el.getClientRects().length > 0) return near === el.getBoundingClientRect().top < limit;
      if (!near) return false;
      gsap.set(el, { autoAlpha: 1, clipPath: "none" });
      if (el.hasAttribute("data-reveal-group")) gsap.set(el.children, { autoAlpha: 1 });
      return false;
    });
  const immediate = (el: Element) => el.hasAttribute("data-immediate");
  const trigger = (el: Element, start = "top 86%") => (immediate(el) ? undefined : { trigger: el, start, once: true });
  const delayOf = (el: Element) => Number((el as HTMLElement).dataset.delay || 0) + (immediate(el) ? 0.15 : 0);

  // On phones, first-screen text is already painted: it only settles into place.
  const small = window.innerWidth < 1024;
  if (near && small) {
    const first = Array.from(main.querySelectorAll<HTMLElement>("[data-immediate]"));
    gsap.from(first, { y: 18, duration: 1.2, stagger: 0.06, delay: 0.1, clearProps: "transform" });
  }
  const settled = (el: Element) => small && el.hasAttribute("data-immediate");

  q("[data-split]").forEach((el) => {
    if (settled(el)) return;
    gsap.set(el, { autoAlpha: 1 });
    SplitText.create(el, {
      type: "lines",
      mask: "lines",
      linesClass: "split-line",
      autoSplit: true,
      aria: "none",
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 115,
          duration: 1.25,
          stagger: 0.09,
          delay: delayOf(el),
          scrollTrigger: trigger(el, "top 90%"),
        }),
    });
  });

  q("[data-reveal]").forEach((el) => {
    if (settled(el)) return;
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 28 },
      { autoAlpha: 1, y: 0, duration: 1.1, delay: delayOf(el), scrollTrigger: trigger(el), clearProps: "transform" },
    );
  });

  q("[data-reveal-group]").forEach((group) => {
    if (settled(group)) return;
    gsap.fromTo(
      group.children,
      { autoAlpha: 0, y: 26 },
      { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08, delay: delayOf(group), scrollTrigger: trigger(group, "top 84%"), clearProps: "transform" },
    );
  });

  q("[data-clip]").forEach((frame) => {
    const inner = frame.querySelector("img, video, canvas");
    const tl = gsap.timeline({ delay: delayOf(frame), scrollTrigger: trigger(frame, "top 88%") });
    tl.fromTo(frame, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: "luxInOut", onComplete: () => void gsap.set(frame, { clipPath: "none" }) });
    if (inner) tl.fromTo(inner, { scale: 1.18 }, { scale: 1, duration: 1.9 }, 0);
  });

  q("[data-parallax]").forEach((el) => {
    const amount = Number(el.dataset.parallax || 0.12) * 100;
    gsap.fromTo(
      el,
      { yPercent: -amount },
      {
        yPercent: amount,
        ease: "none",
        scrollTrigger: { trigger: el.parentElement ?? el, start: "top bottom", end: "bottom top", scrub: true },
      },
    );
  });

  // Fonts and lazy images change heights; re-measure once things settle.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
