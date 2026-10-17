"use client";

import { useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/components/motion/gsap";
import { useLenis } from "@/components/motion/SmoothScroll";
import { useEnquiry } from "@/components/enquiry/Enquiry";
import { Photo } from "@/components/ui/Photo";
import type { Photo as PhotoData } from "@/lib/photos";

export type Vehicle = { key: string; title: string; microLabel: string; badge?: string; description: string; photos: PhotoData[] };

/** The fleet as a row you can drag or swipe; each vehicle opens with its photos, notes and a reservation. */
export function Fleet({ vehicles }: { vehicles: Vehicle[] }) {
  const row = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<Vehicle | null>(null);
  const lenis = useLenis();
  const enquire = useEnquiry();
  const drag = useRef({ down: false, x: 0, left: 0, moved: false });

  const show = (v: Vehicle) => {
    if (drag.current.moved) return;
    setOpen(v);
    dialog.current?.showModal();
    lenis?.stop();
    if (!prefersReducedMotion()) gsap.fromTo(dialog.current!.firstElementChild, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.8 });
  };
  const close = () => {
    dialog.current?.close();
    lenis?.start();
  };

  return (
    <>
      <div
        ref={row}
        data-lenis-prevent-wheel
        className="no-scrollbar flex cursor-grab snap-x snap-proximity gap-3 overflow-x-auto px-[var(--spacing-gutter)] pb-2 active:cursor-grabbing"
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse") return;
          drag.current = { down: true, x: e.clientX, left: row.current!.scrollLeft, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d.down) return;
          const dx = e.clientX - d.x;
          if (Math.abs(dx) > 5) d.moved = true;
          row.current!.scrollLeft = d.left - dx;
        }}
        onPointerUp={() => {
          drag.current.down = false;
          setTimeout(() => (drag.current.moved = false), 0);
        }}
        onPointerLeave={() => (drag.current.down = false)}
      >
        {vehicles.map((v, i) => (
          <button
            key={v.key}
            type="button"
            onClick={() => show(v)}
            className={`group shrink-0 snap-start text-left ${i % 3 === 1 ? "w-[78vw] sm:w-[44vw] lg:w-[34vw]" : "w-[72vw] sm:w-[36vw] lg:w-[26vw]"}`}
            aria-haspopup="dialog"
          >
            <span className={`relative block overflow-hidden ${i % 3 === 1 ? "aspect-[16/11]" : "aspect-[4/5]"}`} data-clip>
              <Photo photo={v.photos[0]} sizes="(min-width: 1024px) 34vw, 78vw" frameAspect={i % 3 === 1 ? undefined : 0.8} className="pointer-events-none transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.05]" />
            </span>
            <span className="mt-4 block font-display text-[1.75rem] leading-tight">{v.title}</span>
            <span className="mt-1 block text-ink-soft">{v.microLabel}</span>
          </button>
        ))}
      </div>

      <dialog
        ref={dialog}
        aria-label={open?.title}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => e.target === dialog.current && close()}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-forest-950/70 p-0 backdrop:bg-transparent"
      >
        <div data-lenis-prevent className="mx-auto mt-[4vh] max-h-[92vh] w-[min(68rem,calc(100%-2rem))] overflow-y-auto bg-paper text-ink">
          {open && (
            <>
              <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
                {open.photos.map((p) => (
                  <div key={p.key} className="relative aspect-[16/10] w-full shrink-0 snap-start">
                    <Photo photo={p} sizes="(min-width: 1100px) 68rem, 100vw" alt={open.title} />
                  </div>
                ))}
              </div>
              <div className="grid gap-8 p-[clamp(1.25rem,4vw,3rem)] md:grid-cols-12">
                <div className="md:col-span-5">
                  {open.badge && <p className="text-[0.95rem] font-medium text-forest-700">{open.badge}</p>}
                  <h3 className="mt-2 text-title">{open.title}</h3>
                  <p className="mt-2 text-ink-soft">{open.microLabel}</p>
                  <p className="mt-3 text-[0.875rem] text-ink-soft">Swipe the photos to see more.</p>
                </div>
                <div className="md:col-span-7">
                  <p>{open.description}</p>
                  <div className="mt-8 flex flex-wrap gap-4">
                    <button
                      type="button"
                      className="btn btn-forest"
                      onClick={() => {
                        close();
                        enquire({ kind: "vehicle", vehicle: open.title });
                      }}
                    >
                      Reserve now <span className="btn-arrow">→</span>
                    </button>
                    <button type="button" className="link-arrow" onClick={close}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
