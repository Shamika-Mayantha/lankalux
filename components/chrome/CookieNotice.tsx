"use client";

import { useEffect, useState } from "react";

const KEY = "lankalux_consent";

declare global {
  interface Window {
    LankaLuxConsent?: (granted: boolean) => void;
  }
}

/** Asks once before Google Analytics / Google Ads may store cookies (UK and EU visitors need the choice). */
export function CookieNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      setShow(!localStorage.getItem(KEY));
    } catch {
      setShow(false);
    }
  }, []);

  const choose = (granted: boolean) => {
    if (window.LankaLuxConsent) window.LankaLuxConsent(granted);
    else {
      try {
        localStorage.setItem(KEY, granted ? "granted" : "denied");
      } catch {}
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="region"
      aria-label="Cookie choice"
      className="fixed inset-x-4 bottom-4 flex flex-col gap-4 bg-forest-900 px-5 py-4 text-ivory shadow-[0_18px_40px_-14px_rgb(10_25_18/0.6)] ring-1 ring-ivory/10 sm:left-6 sm:right-auto sm:bottom-6 sm:max-w-[26rem]"
      style={{ zIndex: "var(--z-dialog)" }}
    >
      <p className="text-[0.875rem] leading-relaxed text-ivory/80">
        We use cookies to see which of our pages and adverts help travellers find us. Nothing is stored unless you agree.
      </p>
      <div className="flex gap-3">
        <button type="button" onClick={() => choose(true)} className="h-11 flex-1 bg-gold px-5 text-[0.875rem] font-medium text-forest-950 hover:bg-gold-bright">
          Accept
        </button>
        <button type="button" onClick={() => choose(false)} className="h-11 flex-1 px-5 text-[0.875rem] font-medium text-ivory ring-1 ring-ivory/25 hover:ring-ivory/50">
          No thanks
        </button>
      </div>
    </div>
  );
}
