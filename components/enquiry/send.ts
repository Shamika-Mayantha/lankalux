"use client";

import emailjs from "@emailjs/browser";
import { ADMIN_REQUESTS_URL, EMAILJS } from "@/lib/site";

export type EnquirySource = "hero-form" | "itinerary-review" | "vehicle-reservation" | "journey-page";

/** Fields the static site sent; admin.lankalux.com maps them in lib/website-lead.ts. */
export type EnquiryPayload = {
  name: string;
  email: string;
  whatsapp?: string;
  travelDates: string;
  startDate: string | null;
  endDate: string | null;
  passengers?: string;
  numberOfAdults?: number | null;
  numberOfChildren?: number | null;
  childrenAgesValues?: string[] | null;
  kidsAges?: string;
  message: string;
  needAirlineTickets: "Yes" | "No";
  airlineFrom: string;
  airlineDates: string;
  journeyName?: string;
  requestedDestinations?: string | null;
  vehiclePreference?: string | null;
};

declare global {
  interface Window {
    LankaLuxAttribution?: () => Record<string, string>;
  }
}

export function formatDateRange(from: string, to: string) {
  if (!from && !to) return "Not specified";
  const fmt = (ymd: string) => {
    if (!ymd) return "";
    const d = new Date(ymd + "T12:00:00");
    return isNaN(d.getTime()) ? ymd : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };
  const a = fmt(from);
  const b = fmt(to);
  return a && b ? `${a} – ${b}` : a || b;
}

async function sendToAdmin(p: EnquiryPayload, source: EnquirySource): Promise<boolean> {
  try {
    const res = await fetch(ADMIN_REQUESTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        submittedAt: new Date().toISOString(),
        name: p.name,
        email: p.email,
        whatsapp: p.whatsapp,
        travelDates: p.travelDates,
        startDate: p.startDate || null,
        endDate: p.endDate || null,
        passengers: p.passengers,
        numberOfAdults: p.numberOfAdults || null,
        numberOfChildren: p.numberOfChildren || null,
        childrenAgesValues: p.childrenAgesValues || null,
        kidsAges: p.kidsAges,
        message: p.message,
        needAirlineTickets: p.needAirlineTickets,
        airlineFrom: p.airlineFrom,
        airlineDates: p.airlineDates,
        journeyName: p.journeyName,
        requestedDestinations: p.requestedDestinations || p.journeyName || null,
        vehiclePreference: p.vehiclePreference || null,
        attribution: window.LankaLuxAttribution ? window.LankaLuxAttribution() : null,
      }),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sendEmail(p: EnquiryPayload): Promise<boolean> {
  try {
    await emailjs.send(EMAILJS.service, EMAILJS.template, p as unknown as Record<string, unknown>, { publicKey: EMAILJS.publicKey });
    return true;
  } catch {
    return false;
  }
}

/**
 * Every enquiry goes to the admin requests page and to the EmailJS inbox, as before.
 * It counts as sent when either one accepts it.
 */
export async function sendEnquiry(payload: EnquiryPayload, source: EnquirySource) {
  const [admin, email] = await Promise.all([sendToAdmin(payload, source), sendEmail(payload)]);
  return admin || email;
}
