"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

// The forms (and the EmailJS client) load the first time someone opens one.
const EnquiryDialog = dynamic(() => import("./EnquiryDialog").then((m) => m.EnquiryDialog), { ssr: false });

export type EnquiryKind = "booking" | "itinerary" | "vehicle" | "journey";
export type EnquiryRequest = { kind: EnquiryKind; vehicle?: string; journey?: string };

const Ctx = createContext<(req: EnquiryRequest) => void>(() => {});
export const useEnquiry = () => useContext(Ctx);

/** Opens the enquiry forms from anywhere: the hook, or `window.dispatchEvent(new CustomEvent("lux:enquire", { detail }))`. */
export function EnquiryProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<EnquiryRequest | null>(null);
  const [used, setUsed] = useState(false);
  const open = useCallback((req: EnquiryRequest) => {
    setUsed(true);
    setRequest(req);
  }, []);

  useEffect(() => {
    const onEvent = (e: Event) => open((e as CustomEvent<EnquiryRequest>).detail ?? { kind: "booking" });
    window.addEventListener("lux:enquire", onEvent);
    return () => window.removeEventListener("lux:enquire", onEvent);
  }, [open]);

  return (
    <Ctx.Provider value={open}>
      {children}
      {used && <EnquiryDialog request={request} onClose={() => setRequest(null)} />}
    </Ctx.Provider>
  );
}

export function EnquiryButton({
  kind = "booking",
  vehicle,
  journey,
  className = "btn",
  children,
}: EnquiryRequest & { kind?: EnquiryKind; className?: string; children: React.ReactNode }) {
  const open = useEnquiry();
  return (
    <button type="button" className={className} onClick={() => open({ kind, vehicle, journey })}>
      {children}
    </button>
  );
}
