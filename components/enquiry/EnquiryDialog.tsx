"use client";

import { useEffect, useId, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/components/motion/gsap";
import { useLenis } from "@/components/motion/SmoothScroll";
import { EMAIL, WHATSAPP_URL } from "@/lib/site";
import type { EnquiryRequest } from "./Enquiry";
import { formatDateRange, sendEnquiry, type EnquiryPayload, type EnquirySource } from "./send";

const TITLES: Record<EnquiryRequest["kind"], string> = {
  booking: "Plan your journey",
  itinerary: "Review my itinerary",
  vehicle: "Vehicle reservation",
  journey: "Book your journey",
};

const INTROS: Record<EnquiryRequest["kind"], string> = {
  booking: "Tell us your dates, who is travelling and the pace you like. We reply with a custom itinerary, then refine it with you.",
  itinerary: "Send your hotels or route. We look at pacing, driving times, stops and activities, and tell you what we would change. No obligation.",
  vehicle: "Tell us your dates and we will confirm availability for this vehicle.",
  journey: "Reserve this journey as it is, or tell us what to change and we will tailor it.",
};

const FAILED =
  "We're sorry, your message couldn't be sent at the moment. Please email us directly at hello@lankalux.com or contact us on WhatsApp and we'll be happy to help.";

const AGE_OPTIONS = [
  { value: "", label: "Select age…" },
  { value: "under2", label: "Under 2" },
  { value: "2-5", label: "2–5 years" },
  { value: "6-11", label: "6–11 years" },
];

const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export function EnquiryDialog({ request, onClose }: { request: EnquiryRequest | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const [current, setCurrent] = useState<EnquiryRequest | null>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d || !request) return;
    setCurrent(request);
    setStatus("idle");
    setError("");
    if (!d.open) d.showModal();
    lenis?.stop();
    if (!prefersReducedMotion()) {
      gsap.fromTo(d, { backgroundColor: "rgb(10 25 18 / 0)" }, { backgroundColor: "rgb(10 25 18 / 0.6)", duration: 0.6 });
      gsap.fromTo(panel.current, { xPercent: 100 }, { xPercent: 0, duration: 0.9, ease: "lux" });
      gsap.fromTo(panel.current!.querySelectorAll("[data-field]"), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, stagger: 0.04, duration: 0.7, delay: 0.25 });
    }
  }, [request, lenis]);

  const close = () => {
    const d = dialog.current;
    const finish = () => {
      d?.close();
      lenis?.start();
      onClose();
    };
    if (!d?.open) return;
    if (prefersReducedMotion()) return finish();
    gsap.to(panel.current, { xPercent: 100, duration: 0.6, ease: "luxInOut" });
    gsap.to(d, { backgroundColor: "rgb(10 25 18 / 0)", duration: 0.6, onComplete: finish });
  };

  const submit = async (payload: EnquiryPayload, source: EnquirySource) => {
    setStatus("sending");
    setError("");
    const ok = await sendEnquiry(payload, source);
    setStatus(ok ? "sent" : "error");
    if (!ok) setError(FAILED);
  };

  const kind = current?.kind ?? "booking";

  return (
    <dialog
      ref={dialog}
      aria-labelledby="enquiry-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) close();
      }}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-transparent"
      style={{ backgroundColor: "rgb(10 25 18 / 0.6)" }}
    >
      <div
        ref={panel}
        data-lenis-prevent
        className="ml-auto flex h-full w-full max-w-[44rem] flex-col overflow-y-auto overscroll-contain bg-paper text-ink"
      >
        <div className="flex items-start justify-between gap-6 px-[clamp(1.25rem,4vw,3.5rem)] pb-6 pt-[clamp(1.5rem,4vw,3rem)]">
          <h2 id="enquiry-title" className="text-[clamp(2.25rem,4vw,3.5rem)]">
            {TITLES[kind]}
          </h2>
          <button type="button" onClick={close} className="-mr-2 mt-1 grid size-11 shrink-0 place-items-center" aria-label="Close">
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </div>

        <div className="flex-1 px-[clamp(1.25rem,4vw,3.5rem)] pb-12">
          {status === "sent" ? (
            <div className="py-10" role="status">
              <p className="font-display text-[clamp(1.75rem,3vw,2.5rem)] leading-tight">Thank you. Your message is with us.</p>
              <p className="mt-5 max-w-[46ch] text-ink-soft">
                We will reply by email, usually within a day. For anything urgent, message us on WhatsApp.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <button type="button" className="btn btn-forest" onClick={close}>
                  Close
                </button>
                <a className="link-arrow" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  WhatsApp us <span className="btn-arrow">→</span>
                </a>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-10 max-w-[52ch] text-ink-soft">
                {current?.vehicle ? (
                  <>
                    Vehicle: <strong className="font-medium text-ink">{current.vehicle}</strong>.{" "}
                  </>
                ) : current?.journey ? (
                  <>
                    Journey: <strong className="font-medium text-ink">{current.journey}</strong>.{" "}
                  </>
                ) : null}
                {INTROS[kind]}
              </p>
              {current && kind === "booking" && <BookingForm key={JSON.stringify(current)} onSubmit={submit} status={status} />}
              {current && kind === "itinerary" && <ItineraryForm key={JSON.stringify(current)} onSubmit={submit} status={status} />}
              {current && kind === "vehicle" && <VehicleForm key={JSON.stringify(current)} vehicle={current.vehicle ?? ""} onSubmit={submit} status={status} />}
              {current && kind === "journey" && <JourneyForm key={JSON.stringify(current)} journey={current.journey ?? ""} onSubmit={submit} status={status} />}
              {error && (
                <p role="alert" className="mt-6 bg-sand px-5 py-4 text-[0.95rem]">
                  {error}
                </p>
              )}
              <p className="mt-12 text-[0.95rem] text-ink-soft">
                Prefer to talk?{" "}
                <a className="underline underline-offset-4" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  Chat on WhatsApp
                </a>{" "}
                or email{" "}
                <a className="underline underline-offset-4" href={`mailto:${EMAIL}`}>
                  {EMAIL}
                </a>
                .
              </p>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Fields                                                              */
/* ------------------------------------------------------------------ */

const inputCls =
  "mt-2 block w-full bg-sand/70 px-4 py-3.5 text-[1.0625rem] text-ink outline-none transition-[background-color,box-shadow] duration-300 placeholder:text-ink-soft/70 focus:bg-sand focus:shadow-[inset_0_-2px_0_var(--color-forest-700)]";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label data-field className="block">
      <span className="text-[0.95rem] font-medium">
        {label}
        {hint && <span className="font-normal text-ink-soft"> {hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Text({ name, label, hint, type = "text", required, placeholder, defaultValue, autoComplete }: {
  name: string; label: string; hint?: string; type?: string; required?: boolean; placeholder?: string; defaultValue?: string | number; autoComplete?: string;
}) {
  return (
    <Field label={label + (required ? " *" : "")} hint={hint}>
      <input name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue} autoComplete={autoComplete} className={inputCls} />
    </Field>
  );
}

function Area({ name, label, required, placeholder, defaultValue }: { name: string; label: string; required?: boolean; placeholder?: string; defaultValue?: string }) {
  return (
    <Field label={label + (required ? " *" : "")}>
      <textarea name={name} required={required} placeholder={placeholder} defaultValue={defaultValue} rows={5} className={`${inputCls} resize-y`} />
    </Field>
  );
}

function DateRange({ from, to, labelFrom = "Arrival", labelTo = "Departure", title, hint, required }: {
  from: string; to: string; labelFrom?: string; labelTo?: string; title: string; hint?: string; required?: boolean;
}) {
  const [start, setStart] = useState("");
  const min = today();
  const id = useId();
  return (
    <fieldset data-field>
      <legend className="text-[0.95rem] font-medium">
        {title}
        {required ? " *" : ""}
        {hint && <span className="font-normal text-ink-soft"> {hint}</span>}
      </legend>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <label htmlFor={id + "a"} className="text-[0.875rem] text-ink-soft">
          {labelFrom}
          <input id={id + "a"} type="date" name={from} min={min} required={required} onChange={(e) => setStart(e.target.value)} className={inputCls} />
        </label>
        <label htmlFor={id + "b"} className="text-[0.875rem] text-ink-soft">
          {labelTo}
          <input id={id + "b"} type="date" name={to} min={start || min} required={required} className={inputCls} />
        </label>
      </div>
    </fieldset>
  );
}

function Airline() {
  const [on, setOn] = useState(false);
  return (
    <div data-field className="space-y-6">
      <label className="flex cursor-pointer items-center gap-3">
        <input type="checkbox" name="needAirlineTickets" checked={on} onChange={(e) => setOn(e.target.checked)} className="size-5 accent-[var(--color-forest-700)]" />
        <span>Need airline tickets as well</span>
      </label>
      {on && (
        <div className="space-y-6">
          <Text name="airlineFrom" label="Flying from" required placeholder="e.g., New York, London, Dubai" />
          <DateRange title="Flight dates" from="airlineDateFrom" to="airlineDateTo" labelFrom="Outbound" labelTo="Return" required />
        </div>
      )}
    </div>
  );
}

function Submit({ status, label }: { status: string; label: string }) {
  return (
    <div data-field className="pt-4">
      <button type="submit" className="btn btn-forest w-full sm:w-auto" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : label} <span className="btn-arrow">→</span>
      </button>
    </div>
  );
}

type FormProps = { onSubmit: (p: EnquiryPayload, s: EnquirySource) => void; status: string };
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function airlineFields(fd: FormData) {
  const need = fd.get("needAirlineTickets") === "on";
  return {
    needAirlineTickets: (need ? "Yes" : "No") as "Yes" | "No",
    airlineFrom: (need && str(fd, "airlineFrom")) || "N/A",
    airlineDates: need ? formatDateRange(str(fd, "airlineDateFrom"), str(fd, "airlineDateTo")) : "N/A",
  };
}

/* ------------------------------------------------------------------ */
/* Forms: same fields and payloads as the original site               */
/* ------------------------------------------------------------------ */

function BookingForm({ onSubmit, status }: FormProps) {
  const [children, setChildren] = useState(0);
  return (
    <form
      className="space-y-7"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const adults = str(fd, "adults");
        const ages: string[] = [];
        const ageValues: string[] = [];
        for (let i = 1; i <= children; i++) {
          const v = str(fd, "childAge" + i);
          if (v) {
            ageValues.push(v);
            ages.push(AGE_OPTIONS.find((o) => o.value === v)?.label ?? v);
          }
        }
        let passengers = `${adults} adult${adults !== "1" ? "s" : ""}`;
        if (children > 0) {
          passengers += `, ${children} child${children !== 1 ? "ren" : ""}`;
          if (ages.length) passengers += ` (ages: ${ages.join(", ")})`;
        }
        const from = str(fd, "travelFrom");
        const to = str(fd, "travelTo");
        onSubmit(
          {
            name: str(fd, "name"),
            email: str(fd, "email"),
            whatsapp: str(fd, "whatsapp") || "Not provided",
            travelDates: formatDateRange(from, to),
            startDate: from || null,
            endDate: to || null,
            passengers,
            numberOfAdults: parseInt(adults, 10) || null,
            numberOfChildren: children,
            childrenAgesValues: ageValues.length ? ageValues : null,
            kidsAges: ages.length ? ages.join(", ") : "None",
            message: str(fd, "message"),
            ...airlineFields(fd),
          },
          "hero-form",
        );
      }}
    >
      <div className="grid gap-7 sm:grid-cols-2">
        <Text name="name" label="Name" required autoComplete="name" />
        <Text name="email" label="Email" type="email" required autoComplete="email" />
      </div>
      <Text name="whatsapp" label="WhatsApp number" hint="(optional)" type="tel" placeholder="e.g. +94 77 123 4567" autoComplete="tel" />
      <DateRange title="Travel dates" hint="(optional)" from="travelFrom" to="travelTo" />
      <div data-field className="grid grid-cols-2 gap-3">
        <Field label="Adults">
          <select name="adults" defaultValue="2" className={inputCls}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
            <option value="10">10+</option>
          </select>
        </Field>
        <Field label="Children">
          <select name="children" value={children} onChange={(e) => setChildren(parseInt(e.target.value, 10))} className={inputCls}>
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </Field>
      </div>
      {children > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: children }, (_, i) => (
            <Field key={i} label={`Child ${i + 1}`}>
              <select name={`childAge${i + 1}`} className={inputCls} aria-label={`Child ${i + 1} age`}>
                {AGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
          ))}
        </div>
      )}
      <Area name="message" label="Message" required placeholder="Tell us about your travel preferences, special requests, or any questions..." />
      <Airline />
      <Submit status={status} label="Send inquiry" />
    </form>
  );
}

function ItineraryForm({ onSubmit, status }: FormProps) {
  return (
    <form
      className="space-y-7"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const travellers = str(fd, "travellers");
        const route = str(fd, "itinerary");
        const notes = str(fd, "notes");
        const file = fd.get("itineraryFile");
        let fileText = "";
        if (file instanceof File && file.size) {
          try {
            let text = await file.text();
            if (text.length > 8000) text = text.slice(0, 8000) + "\n[truncated]";
            fileText = `Uploaded file (${file.name}):\n${text}`;
          } catch {
            fileText = `Uploaded file name: ${file.name} (could not read contents)`;
          }
        }
        const parts = ["ITINERARY REVIEW", "Travellers: " + (travellers || "Not specified"), "Current itinerary or route:", route];
        if (fileText) parts.push(fileText);
        if (notes) parts.push("Additional notes:\n" + notes);
        const from = str(fd, "travelFrom");
        const to = str(fd, "travelTo");
        onSubmit(
          {
            name: str(fd, "name"),
            email: str(fd, "email"),
            whatsapp: str(fd, "whatsapp") || "Not provided",
            travelDates: formatDateRange(from, to),
            startDate: from || null,
            endDate: to || null,
            passengers: travellers ? travellers + " travellers" : "",
            numberOfAdults: travellers ? parseInt(travellers, 10) : null,
            kidsAges: "None",
            message: parts.join("\n\n"),
            needAirlineTickets: "No",
            airlineFrom: "N/A",
            airlineDates: "N/A",
          },
          "itinerary-review",
        );
      }}
    >
      <div className="grid gap-7 sm:grid-cols-2">
        <Text name="name" label="Name" required autoComplete="name" />
        <Text name="email" label="Email" type="email" required autoComplete="email" />
      </div>
      <Text name="whatsapp" label="WhatsApp or phone" hint="(optional)" type="tel" placeholder="e.g. +94 77 123 4567" />
      <DateRange title="Travel dates" from="travelFrom" to="travelTo" />
      <Text name="travellers" label="Number of travellers" type="number" defaultValue={2} />
      <Area name="itinerary" label="Current itinerary or route" required placeholder="Paste your hotels, route or day-by-day plan here." />
      <Field label="Or upload an itinerary file" hint="(optional, text files)">
        <input type="file" name="itineraryFile" accept=".txt,.md,.csv,.rtf,.text" className="mt-2 block w-full text-[0.95rem] file:mr-4 file:bg-forest-900 file:px-4 file:py-2.5 file:text-ivory" />
        <span className="mt-2 block text-[0.875rem] text-ink-soft">
          Text files are added to your message. For a PDF or Word file, paste the plan above or email it to {EMAIL} after sending.
        </span>
      </Field>
      <Area name="notes" label="Additional notes" placeholder="Anything else we should know." />
      <Submit status={status} label="Send itinerary" />
    </form>
  );
}

function VehicleForm({ vehicle, onSubmit, status }: FormProps & { vehicle: string }) {
  return (
    <form
      className="space-y-7"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const from = str(fd, "travelFrom");
        const to = str(fd, "travelTo");
        onSubmit(
          {
            name: str(fd, "name"),
            email: str(fd, "email"),
            travelDates: formatDateRange(from, to),
            startDate: from || null,
            endDate: to || null,
            message: `Vehicle: ${vehicle}\n\n${str(fd, "message")}`,
            vehiclePreference: vehicle || null,
            needAirlineTickets: "No",
            airlineFrom: "N/A",
            airlineDates: "N/A",
          },
          "vehicle-reservation",
        );
      }}
    >
      <div className="grid gap-7 sm:grid-cols-2">
        <Text name="name" label="Name" required autoComplete="name" />
        <Text name="email" label="Email" type="email" required autoComplete="email" />
      </div>
      <DateRange title="Travel dates" hint="(optional)" from="travelFrom" to="travelTo" />
      <Area name="message" label="Message" required defaultValue={`Hi LankaLux, I'd like to reserve the ${vehicle}. Please share availability and pricing.`} />
      <Submit status={status} label="Send inquiry" />
    </form>
  );
}

function JourneyForm({ journey, onSubmit, status }: FormProps & { journey: string }) {
  return (
    <form
      className="space-y-7"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const from = str(fd, "travelFrom");
        const to = str(fd, "travelTo");
        onSubmit(
          {
            name: str(fd, "name"),
            email: str(fd, "email"),
            travelDates: formatDateRange(from, to),
            startDate: from || null,
            endDate: to || null,
            message: str(fd, "message"),
            ...airlineFields(fd),
            journeyName: journey,
            requestedDestinations: journey,
          },
          "journey-page",
        );
      }}
    >
      <div className="grid gap-7 sm:grid-cols-2">
        <Text name="name" label="Name" required autoComplete="name" />
        <Text name="email" label="Email" type="email" required autoComplete="email" />
      </div>
      <DateRange title="Travel dates" from="travelFrom" to="travelTo" required />
      <Area name="message" label="Message" placeholder="Tell us about your travel preferences, special requests, or any questions..." />
      <Airline />
      <Submit status={status} label="Send inquiry" />
    </form>
  );
}
