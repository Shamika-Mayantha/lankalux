export const SITE_URL = "https://lankalux.com";
export const EMAIL = "hello@lankalux.com";
export const WHATSAPP_NUMBER = "94763261788";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
export const INSTAGRAM_URL = "https://www.instagram.com/lanka.lux/";
export const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61585804686778";

export const ADMIN_ORIGIN = "https://admin.lankalux.com";
export const SITE_CONTENT_URL = `${ADMIN_ORIGIN}/api/site-content`;
export const ADMIN_REQUESTS_URL = `${ADMIN_ORIGIN}/api/requests`;
export const CONCIERGE_URL = `${ADMIN_ORIGIN}/api/concierge`;

// EmailJS account the static site already sent enquiries through.
export const EMAILJS = { publicKey: "QUDoyR6ArRD0hqhQS", service: "service_2rzlol8", template: "template_9n2ggh3" };

export function whatsappLink(text?: string) {
  return text ? `${WHATSAPP_URL}?text=${encodeURIComponent(text)}` : WHATSAPP_URL;
}

export const PRIMARY_NAV = [
  { href: "/journeys", label: "Journeys" },
  { href: "/#fleet", label: "Fleet" },
  { href: "/#about", label: "How we travel" },
  { href: "/private-chauffeur-guide-sri-lanka", label: "Chauffeur-guide" },
];

export const JOURNEY_LINKS = [
  { href: "/signature-journey", label: "Signature Sri Lanka" },
  { href: "/nature-wildlife-journey", label: "Nature & Wildlife" },
  { href: "/hill-country-journey", label: "Hill Country & Scenic Rail" },
  { href: "/coastal-retreat-journey", label: "Coastal Retreat" },
];

export const PLANNING_LINKS = [
  { href: "/tailor-made-sri-lanka-tours", label: "Tailor-made tours" },
  { href: "/private-chauffeur-guide-sri-lanka", label: "Private chauffeur-guide" },
  { href: "/sri-lanka-family-tours", label: "Family travel" },
  { href: "/10-day-sri-lanka-itinerary", label: "10-day itinerary" },
];

export const DESTINATION_LINKS = [
  { href: "/destinations/sigiriya", label: "Sigiriya" },
  { href: "/destinations/kandy", label: "Kandy" },
  { href: "/destinations/ella", label: "Ella" },
  { href: "/destinations/yala", label: "Yala" },
  { href: "/destinations/udawalawe", label: "Udawalawe" },
  { href: "/destinations/galle", label: "Galle" },
  { href: "/destinations/mirissa", label: "Mirissa" },
];

export const GUIDE_LINKS = [
  { href: "/guides/how-many-days-in-sri-lanka", label: "How many days" },
  { href: "/guides/best-time-to-visit-sri-lanka", label: "Best time to visit" },
  { href: "/guides/chauffeur-guide-vs-self-driving", label: "Chauffeur-guide vs self-drive" },
  { href: "/guides/sri-lanka-with-children", label: "Travelling with children" },
  { href: "/guides/yala-vs-udawalawe", label: "Yala vs Udawalawe" },
  { href: "/guides/sri-lanka-hill-country-train", label: "Hill-country train" },
];
