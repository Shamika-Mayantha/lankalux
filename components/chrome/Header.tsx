"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/components/motion/gsap";
import { Magnetic } from "@/components/motion/Magnetic";
import { useLenis } from "@/components/motion/SmoothScroll";
import { useEnquiry } from "@/components/enquiry/Enquiry";
import { DESTINATION_LINKS, EMAIL, GUIDE_LINKS, INSTAGRAM_URL, JOURNEY_LINKS, PLANNING_LINKS, PRIMARY_NAV, WHATSAPP_URL } from "@/lib/site";
import { Logo } from "./Logo";

/**
 * Transparent over the opening photograph, solid forest once the page moves,
 * tucked away while reading downwards and back as soon as you scroll up.
 */
export function Header() {
  const pathname = usePathname();
  const lenis = useLenis();
  const enquire = useEnquiry();
  const bar = useRef<HTMLElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      setSolid(y > 40);
      if (Math.abs(y - last) > 6) {
        setHidden(y > last && y > 240);
        last = y;
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  // Close the menu on any navigation.
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("lux:navigate", close);
    return () => window.removeEventListener("lux:navigate", close);
  }, []);

  useEffect(() => {
    const el = menu.current;
    if (!el) return;
    const reduce = prefersReducedMotion();
    if (open) {
      lenis?.stop();
      document.documentElement.style.overflow = "hidden";
      el.inert = false;
      gsap.set(el, { visibility: "visible" });
      if (reduce) return;
      gsap.timeline()
        .fromTo(el, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "luxInOut" })
        .fromTo(el.querySelectorAll("[data-menu-line]"), { yPercent: 110 }, { yPercent: 0, duration: 1.1, stagger: 0.06 }, 0.35)
        .fromTo(el.querySelectorAll("[data-menu-fade]"), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.04 }, 0.55);
    } else {
      lenis?.start();
      document.documentElement.style.overflow = "";
      el.inert = true;
      if (reduce) return void gsap.set(el, { visibility: "hidden" });
      gsap.to(el, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.7, ease: "luxInOut", onComplete: () => void gsap.set(el, { visibility: "hidden" }) });
    }
  }, [open, lenis]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const show = open || !hidden;
  const filled = solid && !open;

  return (
    <>
      <header
        ref={bar}
        className={`fixed inset-x-0 top-0 text-ivory transition-[transform,background-color] duration-700 ease-[var(--ease-out-expo)] ${filled ? "bg-forest-900" : "bg-transparent"}`}
        style={{ zIndex: "var(--z-header)", transform: show ? "translateY(0)" : "translateY(-100%)" }}
      >
        {!filled && !open && <div aria-hidden="true" className="scrim-top pointer-events-none absolute inset-x-0 top-0 h-36" />}
        <div className="wrap relative flex h-[var(--header-h)] items-center justify-between gap-6">
          <Link href="/" aria-label="LankaLux home" className="relative" style={{ zIndex: 1 }}>
            <Logo />
          </Link>

          <nav aria-label="Main" className={`hidden items-center gap-9 transition-opacity duration-500 lg:flex ${open ? "pointer-events-none opacity-0" : ""}`}>
            {PRIMARY_NAV.map((l) => (
              <Link key={l.href} href={l.href} className="link-arrow py-2 text-[0.975rem]" aria-current={pathname === l.href ? "page" : undefined}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="relative flex items-center gap-3 sm:gap-5" style={{ zIndex: 1 }}>
            <span className="hidden sm:block">
              <Magnetic>
                <button type="button" className="btn min-h-11 px-5 text-[0.95rem]" onClick={() => enquire({ kind: "booking" })}>
                  Plan your journey
                </button>
              </Magnetic>
            </span>
            <button
              type="button"
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((o) => !o)}
              className="group relative flex h-11 items-center gap-3 pl-2"
            >
              <span className="hidden text-[0.975rem] md:inline">{open ? "Close" : "Menu"}</span>
              <span className="relative block h-3 w-8" aria-hidden="true">
                <span className={`absolute left-0 top-0 block h-[1.5px] w-full bg-current transition-transform duration-500 ease-[var(--ease-out-expo)] ${open ? "translate-y-[5px] rotate-45" : ""}`} />
                <span className={`absolute bottom-0 left-0 block h-[1.5px] w-full bg-current transition-transform duration-500 ease-[var(--ease-out-expo)] ${open ? "-translate-y-[5.5px] -rotate-45" : "group-hover:scale-x-75 origin-right"}`} />
              </span>
            </button>
          </div>
        </div>
      </header>

      <div
        id="site-menu"
        ref={menu}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        inert
        data-lenis-prevent
        className="fixed inset-0 overflow-y-auto bg-forest-950 text-ivory"
        style={{ zIndex: "var(--z-menu)", visibility: "hidden" }}
      >
        <div className="wrap grid min-h-full gap-14 pb-12 pt-[calc(var(--header-h)+3rem)] lg:grid-cols-12 lg:gap-8">
          <nav aria-label="Menu" className="lg:col-span-7">
            <ul className="space-y-1">
              {[{ href: "/", label: "Home" }, ...PRIMARY_NAV].map((l) => (
                <li key={l.href} className="overflow-clip">
                  <Link
                    href={l.href}
                    data-menu-line
                    className="inline-block font-display text-[clamp(2.75rem,7.2vw,6.5rem)] leading-[1.02] tracking-[-0.03em] transition-colors duration-500 hover:text-gold"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li className="overflow-clip">
                <button
                  type="button"
                  data-menu-line
                  onClick={() => {
                    setOpen(false);
                    enquire({ kind: "booking" });
                  }}
                  className="inline-block font-display text-[clamp(2.75rem,7.2vw,6.5rem)] leading-[1.02] tracking-[-0.03em] text-gold transition-colors duration-500 hover:text-gold-bright"
                >
                  Plan your journey
                </button>
              </li>
            </ul>
          </nav>

          <div className="grid content-start gap-10 sm:grid-cols-2 lg:col-span-5 lg:pt-4">
            <MenuList title="Journeys" links={JOURNEY_LINKS} />
            <MenuList title="Planning" links={PLANNING_LINKS} />
            <MenuList title="Destinations" links={DESTINATION_LINKS} />
            <MenuList title="Guides" links={GUIDE_LINKS} />
            <div data-menu-fade className="space-y-2 text-[0.975rem] sm:col-span-2">
              <a className="link-arrow" href={`mailto:${EMAIL}`}>{EMAIL}</a>
              <div className="flex gap-6">
                <a className="link-arrow" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                <a className="link-arrow" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Instagram</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function MenuList({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div data-menu-fade>
      <p className="mb-3 font-display text-[1.375rem] text-mist">{title}</p>
      <ul className="space-y-1.5 text-[0.975rem]">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} prefetch={false} className="link-arrow">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
