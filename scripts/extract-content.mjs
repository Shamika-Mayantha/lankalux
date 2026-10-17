// One-off: reads the legacy static pages in /legacy and writes their content and SEO head
// into content/generated/*.json, so the Next.js pages render exactly the same words.
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const ROOT = path.resolve(import.meta.dirname, "..");
const LEGACY = path.join(ROOT, "legacy");
const OUT = path.join(ROOT, "content", "generated");
fs.mkdirSync(OUT, { recursive: true });

const read = (f) => cheerio.load(fs.readFileSync(path.join(LEGACY, f), "utf8"), { decodeEntities: true });
const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
// Image keys are the original repo paths without a leading slash: "images/fleet/voxy1.jpg"
const imageKey = (u) => (u || "").replace(/^https?:\/\/(www\.)?lankalux\.com/, "").replace(/^\/+/, "").replace(/\?.*$/, "") || null;
const bgUrl = (style) => {
  const m = /url\((['"]?)([^'")]+)\1\)/.exec(style || "");
  return m ? imageKey(m[2]) : null;
};

const routeOf = (file) => {
  const p = file.replace(/\\/g, "/").replace(/\.html$/, "");
  return p === "index" ? "/" : "/" + p;
};

function meta($) {
  const m = (sel, attr = "content") => $(sel).attr(attr) || null;
  return {
    title: clean($("title").text()),
    description: m('meta[name="description"]'),
    robots: m('meta[name="robots"]'),
    canonical: m('link[rel="canonical"]', "href"),
    og: {
      type: m('meta[property="og:type"]'),
      url: m('meta[property="og:url"]'),
      title: m('meta[property="og:title"]'),
      description: m('meta[property="og:description"]'),
      image: m('meta[property="og:image"]'),
      imageAlt: m('meta[property="og:image:alt"]'),
      siteName: m('meta[property="og:site_name"]'),
      locale: m('meta[property="og:locale"]'),
    },
    twitter: {
      card: m('meta[name="twitter:card"]'),
      title: m('meta[name="twitter:title"]'),
      description: m('meta[name="twitter:description"]'),
      image: m('meta[name="twitter:image"]'),
    },
    jsonLd: $('script[type="application/ld+json"]')
      .map((_, el) => JSON.parse($(el).html()))
      .get(),
  };
}

// Normalise links inside rich text to root-relative paths.
function bodyHtml($, $el) {
  $el.find("a[href]").each((_, a) => {
    const href = $(a).attr("href");
    if (/^https?:\/\/(www\.)?lankalux\.com/.test(href)) $(a).attr("href", href.replace(/^https?:\/\/(www\.)?lankalux\.com/, "") || "/");
  });
  return $.html($el.contents()).replace(/\n\s*/g, "\n").trim();
}

const files = [
  "index.html", "journeys.html", "404.html", "10-day-sri-lanka-itinerary.html",
  "private-chauffeur-guide-sri-lanka.html", "tailor-made-sri-lanka-tours.html", "sri-lanka-family-tours.html",
  "signature-journey.html", "hill-country-journey.html", "nature-wildlife-journey.html", "coastal-retreat-journey.html",
  ...fs.readdirSync(path.join(LEGACY, "destinations")).map((f) => "destinations/" + f),
  ...fs.readdirSync(path.join(LEGACY, "guides")).map((f) => "guides/" + f),
];

const metaByRoute = {};
const articles = {};
const journeys = {};

for (const f of files) {
  const $ = read(f);
  const route = routeOf(f);
  metaByRoute[route] = meta($);

  // Article-style pages (destinations, guides, landing pages)
  const $hero = $("section.page-hero");
  const $body = $("article.page-body");
  if ($hero.length && $body.length) {
    const related = $body.find(".related-card").map((_, a) => ({
      href: $(a).attr("href"),
      label: clean($(a).text()),
      image: bgUrl($(a).attr("style")),
    })).get();
    const actions = $body.find(".page-actions a").map((_, a) => ({
      href: $(a).attr("href"),
      label: clean($(a).text()),
      primary: $(a).hasClass("btn"),
    })).get();
    $body.find(".related-row, .page-actions").remove();
    articles[route] = {
      h1: clean($hero.find("h1").text()),
      lead: clean($hero.find("p").first().text()),
      heroImage: bgUrl($hero.attr("style")),
      heroAlt: metaByRoute[route].og.imageAlt,
      body: bodyHtml($, $body),
      related,
      actions,
    };
  }

  // Journey itinerary pages
  if ($(".journey-hero").length && $(".day-section").length) {
    const style = $(".journey-hero").attr("style");
    const days = $(".day-section").map((_, d) => {
      const $d = $(d);
      const $desc = $d.find(".day-description").clone();
      const highlights = $desc.find("ul li").map((_, li) => clean($(li).text())).get();
      $desc.find("h3, ul").remove();
      const $img = $d.find("img.day-image");
      return {
        day: parseInt($d.find(".day-number").text(), 10),
        title: clean($d.find(".day-title").text()),
        body: $desc.find("p").map((_, p) => clean($(p).text())).get(),
        highlights,
        image: imageKey($img.attr("src")),
        alt: $img.attr("alt") || "",
      };
    }).get();
    journeys[route.slice(1)] = {
      h1: clean($(".journey-hero h1").text()),
      lead: clean($(".journey-hero p").text()),
      heroImage: bgUrl(style),
      bookLabel: clean($(".book-now-btn").text()),
      reviewsTitle: clean($(".reviews h2").text()),
      reviews: reviews($),
      days,
    };
  }
}

function reviews($) {
  return $("#reviewTrack .review").map((_, r) => {
    const $r = $(r).clone();
    const author = clean($r.find("span").text()).replace(/^[—–-]\s*/, "");
    $r.find("span").remove();
    return { quote: clean($r.text()).replace(/^["“]|["”]$/g, ""), author };
  }).get();
}

// Homepage: structured pieces the new layout needs, word for word.
const $h = read("index.html");
const src = fs.readFileSync(path.join(LEGACY, "index.html"), "utf8");
const literal = (name) => {
  const start = src.indexOf(`const ${name} = {`);
  let i = src.indexOf("{", start), depth = 0, j = i;
  for (; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) break;
  }
  return Function(`return (${src.slice(i, j + 1)})`)();
};
const sectionText = (sel) => $h(sel).find("p").map((_, p) => clean($h(p).text())).get();
const home = {
  hero: {
    lines: $h(".hero h1 span").map((_, s) => clean($h(s).text())).get(),
    lead: clean($h(".hero-content > p").text()),
    points: $h(".hero-points li").map((_, li) => clean($h(li).text())).get(),
    slides: $h(".hero-slide").map((_, s) => imageKey($h(s).attr("data-bg")) || bgUrl($h(s).attr("style"))).get(),
  },
  about: {
    title: clean($h("#about h2").text()),
    paragraphs: $h("#about .center p").map((_, p) => clean($h(p).text())).get(),
    steps: $h("#about .version-item").map((_, v) => ({ title: clean($h(v).find("h3").text()), text: clean($h(v).find("p").text()) })).get(),
  },
  why: {
    title: clean($h("#why h2").text()),
    items: $h("#why .why-card").map((_, c) => ({ action: $h(c).attr("data-why-action"), title: clean($h(c).find("h3").text()), text: clean($h(c).find("p").text()) })).get(),
    images: $h("#why .diff-image").map((_, d) => imageKey($h(d).attr("data-bg"))).get(),
  },
  services: {
    title: clean($h("#services h2").text()),
    items: $h("#services .card").map((_, c) => ({ title: clean($h(c).find("h3").text()), text: clean($h(c).find("p").text()) })).get(),
  },
  journeys: {
    title: clean($h("#journeys h2").text()),
    intro: bodyHtml($h, $h("#journeys .journeys-content > p").first()),
    items: $h("#journeys .journey-item").map((_, a) => ({
      href: $h(a).attr("href"),
      title: clean($h(a).find(".journey-btn-text").text()),
      images: $h(a).find("img").map((_, i) => ({ src: imageKey($h(i).attr("src")), alt: $h(i).attr("alt") })).get(),
    })).get(),
  },
  itineraryReview: {
    title: clean($h("#itinerary-review h2").text()),
    lead: clean($h("#itinerary-review .section-lead").text()),
    paragraphs: $h("#itinerary-review p:not(.section-lead)").map((_, p) => clean($h(p).text())).get(),
    button: clean($h("#reviewItineraryBtn").text()),
  },
  chauffeur: {
    title: clean($h("#chauffeur h2").text()),
    paragraphs: $h("#chauffeur .split-copy p").map((_, p) => ({ text: clean($h(p).text()), strong: $h(p).hasClass("split-support-title") })).get(),
    image: imageKey($h("#chauffeur .split-stage").attr("data-bg")),
  },
  fleet: {
    title: clean($h("#fleet h2").text()),
    lead: clean($h("#fleet .center p").text()),
    order: $h(".vehicle-card").map((_, c) => $h(c).attr("data-vehicle")).get(),
    vehicles: literal("vehiclesData"),
  },
  filmMoment: imageKey($h(".film-moment-media").attr("data-bg")),
  flexibility: { title: clean($h("#flexibility h2").text()), paragraphs: sectionText("#flexibility") },
  promise: {
    title: clean($h("#promise h2").text()),
    lead: clean($h("#promise .center p").text()),
    items: $h("#promise .promise-list li").map((_, li) => clean($h(li).text())).get(),
    note: clean($h("#promise .promise-note").text()),
  },
  moment: { title: clean($h("#moment h2").text()), paragraphs: sectionText("#moment") },
  fromTheRoad: {
    title: clean($h("#from-the-road h2").text()),
    lead: clean($h("#from-the-road .center p").text()),
  },
  highlights: { title: clean($h("#experiences h2").text()), order: $h(".exp").map((_, e) => $h(e).attr("data-highlight")).get(), data: literal("highlightsData") },
  reviewsTitle: clean($h(".reviews h2").text()),
  reviews: reviews($h),
  how: {
    title: clean($h("#how-it-works h2").text()),
    steps: $h(".how-step").map((_, s) => ({ title: clean($h(s).find("h3").text()), text: clean($h(s).find("p").text()) })).get(),
  },
  faq: {
    title: clean($h("#faq h2").text()),
    items: $h(".faq-item").map((_, f) => ({ q: clean($h(f).find("h3").text()), a: bodyHtml($h, $h(f).find("p")) })).get(),
  },
  cta: { title: clean($h(".cta-section h2").text()), text: clean($h(".cta-section p").text()) },
};

const $j = read("journeys.html");
const journeysIndex = {
  h1: clean($j(".journeys-page-hero h1").text()),
  lead: clean($j(".journeys-page-hero p").text()),
  intro: bodyHtml($j, $j(".journeys-intro p")),
  blocks: $j("a.journey-block").map((_, a) => ({
    href: $j(a).attr("href"),
    tag: clean($j(a).find(".journey-block-tag").text()),
    title: clean($j(a).find("h2").text()),
    desc: clean($j(a).find(".journey-block-desc").text()),
    image: imageKey($j(a).find(".journey-block-bg").attr("data-bg")),
  })).get(),
  footer: clean($j(".journeys-footer-cta p").text()),
};

// Instagram "From the road" cards
const ig = fs.readFileSync(path.join(LEGACY, "lankalux-instagram.js"), "utf8");
const cardsSrc = ig.slice(ig.indexOf("var CARDS = [") + 12, ig.indexOf("];", ig.indexOf("var CARDS = [")) + 1);
home.fromTheRoad.cards = Function("PROFILE", `return ${cardsSrc}`)("https://www.instagram.com/lanka.lux/").map((c) => ({ ...c, image: imageKey(c.image) }));

// The time-limited free-jeep offer was written into page copy; it is now managed as a promotion
// in admin (Website → Promotions), so those sentences are removed from the fixed text and JSON-LD.
const OFFER = /\s*[^.>"]*\bfree (?:safari )?jeep\b[^<"]*?October[^.<"]*\.(?=\s|<|$)/gi;
function stripOffer(value) {
  if (typeof value === "string") return value.replace(OFFER, "").replace(/<p( class="page-note")?>\s*<\/p>\n?/g, "").trim();
  if (Array.isArray(value)) return value.map(stripOffer);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, stripOffer(v)]));
  return value;
}

const write = (name, data) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(stripOffer(data), null, 2) + "\n");
write("meta.json", metaByRoute);
write("articles.json", articles);
write("journeys.json", journeys);
write("home.json", home);
write("journeys-index.json", journeysIndex);
console.log("pages", Object.keys(metaByRoute).length, "articles", Object.keys(articles).length, "journeys", Object.keys(journeys).length);
