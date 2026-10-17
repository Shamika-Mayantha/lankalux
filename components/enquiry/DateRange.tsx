"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * The travel-dates field: two triggers (arrival, departure) that open one calendar in the
 * house style. Values post as YYYY-MM-DD under the same names the native inputs used.
 */

type Ymd = string; // YYYY-MM-DD

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const pad = (n: number) => String(n).padStart(2, "0");
const toYmd = (d: Date): Ymd => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromYmd = (s: Ymd) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (s: Ymd, n: number) => {
  const d = fromYmd(s);
  d.setDate(d.getDate() + n);
  return toYmd(d);
};
const addMonths = (s: Ymd, n: number) => {
  const d = fromYmd(s);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toYmd(d);
};
const monthStart = (s: Ymd) => s.slice(0, 8) + "01";
const today = () => toYmd(new Date());

const fmtWeekday = (s: Ymd) => fromYmd(s).toLocaleDateString("en-GB", { weekday: "short" });
const fmtShort = (s: Ymd) => fromYmd(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const fmtMonth = (s: Ymd) => fromYmd(s).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
const fmtLabel = (s: Ymd) => fromYmd(s).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const nights = (a: Ymd, b: Ymd) => Math.round((fromYmd(b).getTime() - fromYmd(a).getTime()) / 86400000);

const triggerCls =
  "mt-2 flex w-full items-center justify-between gap-3 bg-sand/70 px-4 py-3.5 text-left text-[1.0625rem] text-ink outline-none transition-[background-color,box-shadow] duration-300 hover:bg-sand focus-visible:bg-sand";

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[1.125rem] shrink-0 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function DateRange({
  from,
  to,
  labelFrom = "Arrival",
  labelTo = "Departure",
  title,
  hint,
  required,
}: {
  from: string;
  to: string;
  labelFrom?: string;
  labelTo?: string;
  title: string;
  hint?: string;
  required?: boolean;
}) {
  const [start, setStart] = useState<Ymd>("");
  const [end, setEnd] = useState<Ymd>("");
  const [active, setActive] = useState<"start" | "end" | null>(null);
  const [invalid, setInvalid] = useState(false);
  const root = useRef<HTMLFieldSetElement>(null);
  const startBtn = useRef<HTMLButtonElement>(null);
  const endBtn = useRef<HTMLButtonElement>(null);
  const id = useId();
  const min = today();

  // Close on a click outside the field.
  useEffect(() => {
    if (!active) return;
    const down = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setActive(null);
    };
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, [active]);

  const close = (focus: "start" | "end" | null = active) => {
    setActive(null);
    (focus === "end" ? endBtn : startBtn).current?.focus();
  };

  const pick = (d: Ymd) => {
    setInvalid(false);
    if (active === "start" || !start || d < start) {
      setStart(d);
      if (end && end <= d) setEnd("");
      setActive("end");
      return;
    }
    setEnd(d);
    close("end");
  };

  const trigger = (which: "start" | "end") => {
    const value = which === "start" ? start : end;
    const label = which === "start" ? labelFrom : labelTo;
    const on = active === which;
    return (
      <div className="text-[0.875rem] text-ink-soft">
        <span id={`${id}-${which}`}>{label}</span>
        <button
          ref={which === "start" ? startBtn : endBtn}
          type="button"
          aria-labelledby={`${id}-${which} ${id}-${which}-v`}
          aria-expanded={on}
          aria-haspopup="dialog"
          onClick={() => setActive(on ? null : which === "end" && !start ? "start" : which)}
          className={`${triggerCls} ${on ? "bg-sand shadow-[inset_0_-2px_0_var(--color-forest-700)]" : ""} ${invalid && !value ? "shadow-[inset_0_-2px_0_#9b3b2a]" : ""}`}
        >
          <span id={`${id}-${which}-v`} className={value ? "" : "text-ink-soft/70"}>
            {value ? (
              <>
                <span className="hidden sm:inline">{fmtWeekday(value)}, </span>
                {fmtShort(value)}
              </>
            ) : (
              "Select date"
            )}
          </span>
          <CalendarIcon />
        </button>
      </div>
    );
  };

  return (
    <fieldset ref={root} data-field className="relative">
      <legend className="text-[0.95rem] font-medium">
        {title}
        {required ? " *" : ""}
        {hint && <span className="font-normal text-ink-soft"> {hint}</span>}
      </legend>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {trigger("start")}
        {trigger("end")}
      </div>
      {/* Real inputs carry the values and the required check; an empty one opens the calendar. */}
      {(
        [
          [from, start, "start"],
          [to, end, "end"],
        ] as const
      ).map(([name, value, which]) => (
        <input
          key={name}
          name={name}
          value={value}
          required={required}
          onChange={() => {}}
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/4 h-px w-px opacity-0"
          onInvalid={(e) => {
            e.preventDefault();
            setInvalid(true);
            setActive(which === "end" && !start ? "start" : which);
          }}
        />
      ))}
      {invalid && required && (!start || !end) && (
        <p role="alert" className="mt-2 text-[0.875rem] text-[#9b3b2a]">
          Please choose your {!start ? labelFrom.toLowerCase() : labelTo.toLowerCase()} date.
        </p>
      )}
      {active && (
        <Calendar
          start={start}
          end={end}
          active={active}
          min={active === "end" && start ? start : min}
          heading={active === "start" ? `Choose ${labelFrom.toLowerCase()}` : `Choose ${labelTo.toLowerCase()}`}
          onPick={pick}
          onClose={() => close()}
          onClear={
            start || end
              ? () => {
                  setStart("");
                  setEnd("");
                  setActive("start");
                }
              : undefined
          }
        />
      )}
    </fieldset>
  );
}

function Calendar({
  start,
  end,
  active,
  min,
  heading,
  onPick,
  onClose,
  onClear,
}: {
  start: Ymd;
  end: Ymd;
  active: "start" | "end";
  min: Ymd;
  heading: string;
  onPick: (d: Ymd) => void;
  onClose: () => void;
  onClear?: () => void;
}) {
  const initial = (active === "end" ? end || start : start) || min;
  const [focus, setFocus] = useState<Ymd>(initial < min ? min : initial);
  const [view, setView] = useState<Ymd>(monthStart(focus));
  const [hover, setHover] = useState<Ymd>("");
  const [twoUp, setTwoUp] = useState(false);
  const grid = useRef<HTMLDivElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setTwoUp(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Keep the focused day on screen, and move real focus once the keyboard is in use.
  useEffect(() => {
    const first = view;
    const lastShown = addMonths(view, twoUp ? 1 : 0);
    if (focus < first) setView(monthStart(focus));
    else if (monthStart(focus) > lastShown) setView(addMonths(monthStart(focus), twoUp ? -1 : 0));
    if (moved.current) grid.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus();
  }, [focus, view, twoUp]);

  useEffect(() => {
    grid.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus({ preventScroll: true });
    grid.current?.parentElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    // Only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const key = (e: React.KeyboardEvent) => {
    const step: Record<string, () => Ymd> = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      PageUp: () => addMonths(focus, -1),
      PageDown: () => addMonths(focus, 1),
      Home: () => addDays(focus, -((fromYmd(focus).getDay() + 6) % 7)),
      End: () => addDays(focus, 6 - ((fromYmd(focus).getDay() + 6) % 7)),
    };
    if (e.key === "Escape") {
      // Keep the enquiry dialog open; only the calendar closes.
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    const next = step[e.key];
    if (!next) return;
    e.preventDefault();
    const d = next();
    moved.current = true;
    setFocus(d < min ? min : d);
  };

  const rangeEnd = end || (active === "end" && start && hover > start ? hover : "");
  const canPrev = view > monthStart(min);
  const months = twoUp ? [view, addMonths(view, 1)] : [view];

  return (
    <div
      role="dialog"
      aria-label={heading}
      onKeyDown={key}
      className="lux-pop absolute inset-x-0 top-full mt-2 bg-paper p-4 text-ink shadow-[0_24px_60px_-20px_rgb(10_25_18/0.45)] ring-1 ring-ink/10 sm:p-5"
      style={{ zIndex: 5 }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-ink-soft">{heading}</p>
        <div className="flex items-center">
          <button
            type="button"
            aria-label="Previous month"
            disabled={!canPrev}
            onClick={() => setView(addMonths(view, -1))}
            className="grid size-10 place-items-center transition-opacity disabled:opacity-25"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button type="button" aria-label="Next month" onClick={() => setView(addMonths(view, 1))} className="grid size-10 place-items-center">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div ref={grid} className="grid gap-6 sm:grid-cols-2" onPointerLeave={() => setHover("")}>
        {months.map((m) => (
          <Month
            key={m}
            month={m}
            min={min}
            start={start}
            end={rangeEnd}
            focus={focus}
            onPick={onPick}
            onHover={setHover}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink/10 pt-3 text-[0.875rem]">
        <span className="text-ink-soft" aria-live="polite">
          {start && end ? `${nights(start, end)} night${nights(start, end) === 1 ? "" : "s"}` : active === "end" && start ? "Now pick your last day" : ""}
        </span>
        <div className="flex items-center gap-5">
          {onClear && (
            <button type="button" onClick={onClear} className="text-ink-soft underline-offset-4 hover:underline">
              Clear
            </button>
          )}
          <button type="button" onClick={onClose} className="font-medium underline-offset-4 hover:underline">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function Month({
  month,
  min,
  start,
  end,
  focus,
  onPick,
  onHover,
}: {
  month: Ymd;
  min: Ymd;
  start: Ymd;
  end: Ymd;
  focus: Ymd;
  onPick: (d: Ymd) => void;
  onHover: (d: Ymd) => void;
}) {
  const first = fromYmd(month);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const todayYmd = today();
  const cells: (Ymd | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => addDays(month, i))];

  return (
    <div>
      <p className="mb-2 font-display text-[1.375rem] leading-none">{fmtMonth(month)}</p>
      <div role="grid" aria-label={fmtMonth(month)} className="grid grid-cols-7 text-center">
        <div role="row" className="contents">
          {WEEKDAYS.map((w) => (
            <span role="columnheader" key={w} className="pb-1.5 text-[0.75rem] uppercase tracking-[0.1em] text-ink-soft">
              {w}
            </span>
          ))}
        </div>
        <div role="row" className="contents">
          {cells.map((d, i) => {
            if (!d) return <span key={`x${i}`} role="gridcell" />;
            const disabled = d < min;
            const isStart = d === start;
            const isEnd = d === end;
            const inRange = !!start && !!end && d > start && d < end;
            const edge = isStart || isEnd;
            return (
              <span
                key={d}
                role="gridcell"
                aria-selected={edge}
                className={`relative ${inRange ? "bg-forest-700/10" : ""} ${isStart && end ? "bg-linear-to-r from-transparent from-50% to-forest-700/10 to-50%" : ""} ${isEnd && start ? "bg-linear-to-l from-transparent from-50% to-forest-700/10 to-50%" : ""}`}
              >
                <button
                  type="button"
                  data-day={d}
                  tabIndex={d === focus ? 0 : -1}
                  disabled={disabled}
                  aria-label={fmtLabel(d)}
                  aria-current={d === todayYmd ? "date" : undefined}
                  onClick={() => onPick(d)}
                  onPointerEnter={() => !disabled && onHover(d)}
                  className={`relative mx-auto grid aspect-square w-full max-w-11 place-items-center text-[0.9375rem] tabular-nums transition-colors duration-200 ${
                    edge
                      ? "bg-forest-900 text-ivory"
                      : disabled
                        ? "text-ink/25 line-through decoration-ink/20"
                        : "hover:bg-sand"
                  }`}
                >
                  {Number(d.slice(8))}
                  {d === todayYmd && !edge && <span aria-hidden="true" className="absolute bottom-1.5 size-1 rounded-full bg-gold" />}
                </button>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
