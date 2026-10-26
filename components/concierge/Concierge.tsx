"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLenis } from "@/components/motion/SmoothScroll";
import { CONCIERGE_URL, EMAIL, WHATSAPP_NUMBER, whatsappLink } from "@/lib/site";

/**
 * The LankaLux Concierge: the chat on every page. Replies come from the Website Concierge
 * agent in admin (admin.lankalux.com/api/concierge), which also keeps the conversation,
 * so a returning visitor picks up where they left off.
 */

type Line = { role: "guest" | "concierge" | "team"; text: string; at?: string };

type State = {
  online: boolean;
  takenOver: boolean;
  requestId: string | null;
  messages: Line[];
};

const SESSION_KEY = "lux-concierge-session";
const WHATSAPP_DISPLAY = `+${WHATSAPP_NUMBER.slice(0, 2)} ${WHATSAPP_NUMBER.slice(2, 4)} ${WHATSAPP_NUMBER.slice(4, 7)} ${WHATSAPP_NUMBER.slice(7)}`;

const WELCOME =
  "Welcome to LankaLux. Ask me anything about travelling Sri Lanka with us, or tell me about the trip you have in mind and I will pass it to the team.";
const TAKEN_OVER = "A member of our team is looking after this chat now and will reply to you by email or WhatsApp.";
const FAILED = `Sorry, the chat could not reach us just now. Please email ${EMAIL} or WhatsApp ${WHATSAPP_DISPLAY}.`;

const STARTERS = ["When is the best time to visit?", "What is included in a journey?", "Which vehicle suits our group?", "I would like to plan a trip"];

declare global {
  interface Window {
    LankaLuxAttribution?: () => Record<string, string>;
  }
}

function readSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function newSession(): string {
  const id = "web-" + (crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2, 12)).replace(/[^A-Za-z0-9-]/g, "");
  try {
    localStorage.setItem(SESSION_KEY, id);
  } catch {}
  return id;
}

export function Concierge() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ online: true, takenOver: false, requestId: null, messages: [] });
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [contacts, setContacts] = useState(false);
  const [draft, setDraft] = useState("");
  const [viewport, setViewport] = useState<{ h: number; top: number } | null>(null);
  const session = useRef<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const lenis = useLenis();

  // Restore an earlier chat the first time the panel opens.
  useEffect(() => {
    if (!open || loaded) return;
    setLoaded(true);
    const id = readSession();
    session.current = id;
    if (!id) return;
    fetch(`${CONCIERGE_URL}?session=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) setState({ online: d.online, takenOver: d.takenOver, requestId: d.requestId, messages: d.messages || [] });
      })
      .catch(() => {});
  }, [open, loaded]);

  // Stick to the newest message.
  useEffect(() => {
    const el = body.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.messages, sending, contacts, open]);

  // Phones: the panel fills the screen and follows the on-screen keyboard; the page stays still.
  useEffect(() => {
    if (!open) return;
    const small = window.matchMedia("(max-width: 639px)");
    const vv = window.visualViewport;
    const sync = () => setViewport(small.matches && vv ? { h: vv.height, top: vv.offsetTop } : null);
    sync();
    if (small.matches) lenis?.stop();
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    small.addEventListener("change", sync);
    const t = setTimeout(() => input.current?.focus({ preventScroll: true }), 60);
    return () => {
      clearTimeout(t);
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      small.removeEventListener("change", sync);
      lenis?.start();
    };
  }, [open, lenis]);

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => launcher.current?.focus({ preventScroll: true }));
  }, []);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) close();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, close]);

  const send = async (raw: string) => {
    const text = raw.trim().slice(0, 1000);
    if (!text || sending) return;
    if (!session.current) session.current = newSession();
    setDraft("");
    setContacts(false);
    setSending(true);
    setState((s) => ({ ...s, messages: [...s.messages, { role: "guest", text }] }));
    try {
      const res = await fetch(CONCIERGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.current,
          message: text,
          page: location.pathname,
          attribution: window.LankaLuxAttribution ? window.LankaLuxAttribution() : null,
        }),
      });
      const d = await res.json().catch(() => null);
      if (!d?.success) throw new Error(d?.error || "failed");
      // The chat counts as a lead once admin has opened a request for it.
      if (d.requestId && !state.requestId) window.LankaLuxTrack?.("generate_lead", { form: "concierge" });
      setState((s) => ({
        online: d.online,
        takenOver: d.takenOver,
        requestId: d.requestId ?? s.requestId,
        messages: d.reply ? [...s.messages, { role: "concierge", text: d.reply }] : s.messages,
      }));
      setContacts(!!d.showContacts);
    } catch (err) {
      const msg = err instanceof Error && /too many|too long/i.test(err.message) ? err.message : FAILED;
      setState((s) => ({ ...s, messages: [...s.messages, { role: "concierge", text: msg }] }));
      setContacts(true);
    } finally {
      setSending(false);
      input.current?.focus({ preventScroll: true });
    }
  };

  const restart = () => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {}
    session.current = null;
    setContacts(false);
    setState((s) => ({ online: s.online, takenOver: false, requestId: null, messages: [] }));
    input.current?.focus({ preventScroll: true });
  };

  const empty = state.messages.length === 0;
  const showContacts = contacts || !state.online;

  return (
    <>
      <button
        ref={launcher}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Chat with LankaLux"
        aria-expanded={open}
        aria-controls="lux-concierge"
        className={`group fixed bottom-4 right-4 flex h-14 items-center gap-3 rounded-full bg-forest-900 pl-[1.125rem] pr-[1.125rem] text-ivory shadow-[0_18px_40px_-14px_rgb(10_25_18/0.6)] ring-1 ring-ivory/10 transition-[transform,opacity] duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-0.5 sm:bottom-6 sm:right-6 sm:pr-6 ${open ? "pointer-events-none translate-y-3 opacity-0" : ""}`}
        style={{ zIndex: "var(--z-chat)" }}
      >
        <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <path d="M4.5 5.5h15v10h-8.5l-4.5 3.5v-3.5h-2z" strokeLinejoin="round" />
        </svg>
        <span className="hidden text-[0.9375rem] font-medium tracking-[0.01em] sm:inline">Ask LankaLux</span>
        <span aria-hidden="true" className="absolute right-3 top-3 size-2 rounded-full bg-gold ring-2 ring-forest-900 sm:right-4" />
      </button>

      {open && (
        <div
          id="lux-concierge"
          ref={panel}
          role="dialog"
          aria-label="LankaLux concierge chat"
          data-lenis-prevent
          className="lux-pop fixed inset-0 flex flex-col overflow-hidden bg-paper text-ink sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(42rem,calc(100dvh-3rem))] sm:w-[25.5rem] sm:shadow-[0_30px_80px_-24px_rgb(10_25_18/0.55)] sm:ring-1 sm:ring-ink/10"
          style={{ zIndex: "var(--z-chat)", ...(viewport ? { top: viewport.top, height: viewport.h, bottom: "auto" } : null) }}
        >
          <div className="flex items-start justify-between gap-4 bg-forest-900 px-5 pb-5 pt-5 text-ivory">
            <div>
              <p className="text-[0.75rem] font-medium uppercase tracking-[0.18em] text-gold">LankaLux</p>
              <p className="mt-1.5 font-display text-[1.75rem] leading-none">Concierge</p>
              <p className="mt-2.5 flex items-center gap-2 text-[0.8125rem] text-ivory/70">
                <span aria-hidden="true" className={`size-1.5 rounded-full ${state.online ? "bg-gold" : "bg-ivory/40"}`} />
                {state.online ? "Here for questions and trip requests" : "Our team is on email and WhatsApp"}
              </p>
            </div>
            <div className="-mr-2 -mt-1 flex items-center">
              {!empty && (
                <button type="button" onClick={restart} className="grid size-11 place-items-center text-ivory/70 hover:text-ivory" aria-label="Start a new chat" title="New chat">
                  <svg viewBox="0 0 24 24" className="size-[1.125rem]" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                    <path d="M19 12a7 7 0 1 1-2.05-4.95M19 4.5V8h-3.5" />
                  </svg>
                </button>
              )}
              <button type="button" onClick={close} className="grid size-11 place-items-center" aria-label="Close chat">
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M5 5l14 14M19 5L5 19" />
                </svg>
              </button>
            </div>
          </div>

          <div ref={body} className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-5" aria-live="polite">
            <Bubble line={{ role: "concierge", text: state.online ? WELCOME : `The chat is resting for the moment. Email ${EMAIL} or WhatsApp ${WHATSAPP_DISPLAY} and the team will reply, usually within a day.` }} />
            {empty && state.online && (
              <div className="flex flex-wrap gap-2 pt-1">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="border border-ink/15 px-3.5 py-2 text-left text-[0.875rem] leading-snug transition-colors duration-300 hover:border-forest-700 hover:bg-sand/60"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {state.messages.map((m, i) => (
              <Bubble key={i} line={m} />
            ))}
            {sending && (
              <div className="flex gap-1.5 px-1 py-2" aria-label="Writing a reply">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="size-1.5 rounded-full bg-ink-soft" style={{ animation: `lux-dot 1.2s ${i * 0.16}s infinite` }} />
                ))}
              </div>
            )}
            {state.takenOver && <p className="px-2 py-1 text-center text-[0.8125rem] italic text-ink-soft">{TAKEN_OVER}</p>}
            {state.requestId && (
              <p className="flex items-center justify-center gap-2 py-1 text-[0.8125rem] text-ink-soft">
                <svg viewBox="0 0 24 24" className="size-4 text-forest-700" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                Your details are with our team
              </p>
            )}
            {showContacts && !sending && <Contacts />}
          </div>

          <form
            className="border-t border-ink/10 bg-paper px-4 pb-4 pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            <div className="flex items-end gap-2 bg-sand/70 pl-4 transition-shadow duration-300 focus-within:shadow-[inset_0_-2px_0_var(--color-forest-700)]">
              <label htmlFor="lux-concierge-input" className="sr-only">
                Your message
              </label>
              <textarea
                id="lux-concierge-input"
                ref={input}
                rows={1}
                value={draft}
                maxLength={1000}
                disabled={!state.online}
                placeholder={state.online ? "Ask a question or describe your trip…" : "Chat is resting"}
                onChange={(e) => {
                  setDraft(e.target.value);
                  const t = e.target;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 120) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send(draft);
                  }
                }}
                className="max-h-[120px] min-h-[3.25rem] flex-1 resize-none bg-transparent py-3.5 text-[1rem] leading-snug outline-none placeholder:text-ink-soft/70 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending || !state.online}
                aria-label="Send"
                className="m-1.5 grid size-10 shrink-0 place-items-center bg-forest-900 text-ivory transition-opacity duration-300 disabled:opacity-30"
              >
                <svg viewBox="0 0 24 24" className="size-[1.125rem]" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
            <p className="mt-2.5 text-[0.75rem] leading-snug text-ink-soft">
              Fully tailored itinerary?{" "}
              <a className="underline underline-offset-2 hover:text-ink" href={`mailto:${EMAIL}`}>
                Email us
              </a>{" "}
              or{" "}
              <a className="underline underline-offset-2 hover:text-ink" href={whatsappLink("Hi LankaLux, I would like a tailored itinerary.")} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
              .
            </p>
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({ line }: { line: Line }) {
  if (line.role === "team") {
    return <p className="px-2 text-center text-[0.875rem] italic text-ink-soft">{line.text}</p>;
  }
  const guest = line.role === "guest";
  return (
    <div className={`flex ${guest ? "justify-end" : "justify-start"}`}>
      <p
        className={`max-w-[86%] whitespace-pre-wrap px-4 py-3 text-[0.9375rem] leading-[1.5] [overflow-wrap:anywhere] ${
          guest ? "bg-forest-900 text-ivory" : "bg-sand/70 text-ink"
        }`}
      >
        {line.text}
      </p>
    </div>
  );
}

function Contacts() {
  return (
    <div className="lux-pop mt-1 border border-ink/10 p-4">
      <p className="text-[0.875rem] text-ink-soft">For a fully tailored itinerary, talk to the team directly.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a
          href={whatsappLink("Hi LankaLux, I would like a tailored itinerary.")}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-forest-900 px-3 py-3 text-[0.875rem] font-medium text-ivory transition-colors duration-300 hover:bg-forest-700"
        >
          WhatsApp
        </a>
        <a
          href={`mailto:${EMAIL}?subject=${encodeURIComponent("Tailored Sri Lanka itinerary")}`}
          className="flex items-center justify-center gap-2 bg-sand px-3 py-3 text-[0.875rem] font-medium text-ink transition-colors duration-300 hover:bg-sand/60"
        >
          Email us
        </a>
      </div>
      <p className="mt-2.5 text-center text-[0.75rem] text-ink-soft">
        {EMAIL} · {WHATSAPP_DISPLAY}
      </p>
    </div>
  );
}
