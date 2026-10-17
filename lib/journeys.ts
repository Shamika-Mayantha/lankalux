import journeys from "@/content/generated/journeys.json";
import index from "@/content/generated/journeys-index.json";
import type { Place } from "./route";

export type JourneySlug = keyof typeof journeys;
export const JOURNEY_SLUGS = Object.keys(journeys) as JourneySlug[];

/**
 * The road each day travels on the island map. A day spent in one place has no segment,
 * only a `stay`. Stops follow the itinerary text; joins between them are stylised curves.
 */
type DayRoute = { path?: Place[]; stay: Place };

export const JOURNEY_ROUTES: Record<JourneySlug, DayRoute[]> = {
  "signature-journey": [
    { path: ["airport", "colombo"], stay: "colombo" },
    { path: ["colombo", "dambulla", "sigiriya"], stay: "sigiriya" },
    { path: ["sigiriya", "polonnaruwa"], stay: "polonnaruwa" },
    { path: ["polonnaruwa", "dambulla", "kandy"], stay: "kandy" },
    { path: ["kandy", "nuwaraEliya"], stay: "nuwaraEliya" },
    { path: ["nuwaraEliya", "ella", "yala"], stay: "yala" },
    { stay: "yala" },
    { path: ["yala", "mirissa"], stay: "mirissa" },
    { path: ["mirissa", "galle"], stay: "galle" },
    { path: ["galle", "westCoast", "airport"], stay: "airport" },
  ],
  "hill-country-journey": [
    { path: ["airport", "kandy"], stay: "kandy" },
    { stay: "kandy" },
    { path: ["kandy", "nuwaraEliya"], stay: "nuwaraEliya" },
    { stay: "nuwaraEliya" },
    { path: ["nuwaraEliya", "ella"], stay: "ella" },
    { stay: "ella" },
    { path: ["ella", "udawalawe", "westCoast"], stay: "westCoast" },
    { path: ["westCoast", "airport"], stay: "airport" },
  ],
  "nature-wildlife-journey": [
    { stay: "airport" },
    { path: ["airport", "westCoast", "mirissa", "yala"], stay: "yala" },
    { stay: "yala" },
    { path: ["yala", "udawalawe"], stay: "udawalawe" },
    { path: ["udawalawe", "sinharaja"], stay: "sinharaja" },
    { stay: "sinharaja" },
    { path: ["sinharaja", "colombo", "wilpattu"], stay: "wilpattu" },
    { path: ["wilpattu", "airport"], stay: "airport" },
    { stay: "airport" },
  ],
  "coastal-retreat-journey": [
    { path: ["airport", "kandy", "ella", "arugamBay"], stay: "arugamBay" },
    { stay: "arugamBay" },
    { stay: "arugamBay" },
    { path: ["arugamBay", "yala", "mirissa"], stay: "mirissa" },
    { stay: "mirissa" },
    { path: ["mirissa", "galle"], stay: "galle" },
    { stay: "galle" },
    { path: ["galle", "westCoast", "airport"], stay: "airport" },
  ],
};

export function journey(slug: JourneySlug) {
  const j = journeys[slug];
  const block = index.blocks.find((b) => b.href === "/" + slug);
  return { slug, ...j, tag: block?.tag ?? "", summary: block?.desc ?? "", cover: block?.image ?? j.heroImage };
}

/** Covered by every journey, in the words the homepage FAQ already uses. */
export const INCLUDED = [
  "A private vehicle for your stay",
  "Airport pickup and drop-off",
  "An English-speaking chauffeur-guide",
  "A custom itinerary, refined with you",
  "Hotels can be yours, arranged by LankaLux, or a mix of both",
];

export const NOT_INCLUDED =
  "Train tickets, safari jeep excursions, attraction entrance fees and optional activities are not included unless we specifically say so. We can arrange them where possible, with applicable fees paid separately or on site.";
