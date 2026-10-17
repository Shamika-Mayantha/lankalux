import "server-only";
import { cache } from "react";
import { SITE_CONTENT_URL } from "./site";

/**
 * Reviews and photo overrides managed at admin.lankalux.com (/console/website).
 * Fetched on the server and revalidated every 60s, the same window the admin feed is edge-cached for.
 * If admin is unreachable the site renders its built-in reviews and photos.
 */
export type Review = { quote: string; author: string };
export type ReviewPage = "home" | "signature-journey" | "hill-country-journey" | "nature-wildlife-journey" | "coastal-retreat-journey";
export type Promotion = { title: string; message: string; ends_on: string | null };
export type SiteContent = {
  photos: Record<string, string>;
  reviews: Partial<Record<ReviewPage, Review[]>>;
  /** null: admin has no promotions table yet, so the built-in offer applies. */
  promotions: Promotion[] | null;
};

const EMPTY: SiteContent = { photos: {}, reviews: {}, promotions: null };

// The offer the old pages carried, shown only until admin manages promotions (Website → Promotions).
const BUILT_IN_PROMOTIONS: Promotion[] = [
  {
    title: "Free safari jeep",
    message: "For a limited time, confirmed bookings include a free safari jeep at one selected park (jeep only, not park tickets).",
    ends_on: "2026-10-31",
  },
];

export const REVALIDATE_SECONDS = 60;

export const getSiteContent = cache(async (): Promise<SiteContent> => {
  try {
    const res = await fetch(SITE_CONTENT_URL, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ["site-content"] },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return EMPTY;
    const json = await res.json();
    if (!json || json.success !== true) return EMPTY;
    return { photos: json.photos ?? {}, reviews: json.reviews ?? {}, promotions: Array.isArray(json.promotions) ? json.promotions : null };
  } catch {
    return EMPTY;
  }
});

export async function getReviews(page: ReviewPage, fallback: Review[]): Promise<Review[]> {
  const { reviews } = await getSiteContent();
  const list = reviews[page];
  return list && list.length ? list : fallback;
}

/** Live promotions: admin's when it manages them, otherwise the built-in offer; never past their last day. */
export async function getPromotions(): Promise<Promotion[]> {
  const { promotions } = await getSiteContent();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
  return (promotions ?? BUILT_IN_PROMOTIONS).filter((p) => !p.ends_on || p.ends_on >= today);
}
