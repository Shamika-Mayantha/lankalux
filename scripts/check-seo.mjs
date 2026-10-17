// Compares every page's rendered <head> on the new site with the SEO data recorded from the old pages.
import fs from "node:fs";
import * as cheerio from "cheerio";
const meta = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const base = process.argv[3];
let problems = 0;
for (const [route, m] of Object.entries(meta)) {
  const url = route === "/404" ? base + "/this-does-not-exist" : base + route;
  const res = await fetch(url, { redirect: "manual" });
  const $ = cheerio.load(await res.text());
  const got = {
    title: $("title").text(),
    description: $('meta[name="description"]').attr("content") ?? null,
    canonical: $('link[rel="canonical"]').attr("href") ?? null,
    ogImage: $('meta[property="og:image"]').attr("content") ?? null,
    ogTitle: $('meta[property="og:title"]').attr("content") ?? null,
    robots: $('meta[name="robots"]').attr("content") ?? null,
    ld: $('script[type="application/ld+json"]').map((_, e) => JSON.parse($(e).html())).get(),
    h1: $("h1").length,
  };
  const want = { title: m.title, description: m.description, canonical: m.canonical, ogImage: m.og.image, ogTitle: m.og.title };
  const diffs = Object.entries(want).filter(([k, v]) => (v ?? null) !== (got[k] ?? null)).map(([k, v]) => `${k}: want ${JSON.stringify(v)?.slice(0, 70)} got ${JSON.stringify(got[k])?.slice(0, 70)}`);
  const ldTypes = (x) => JSON.stringify(x.map((b) => b["@type"]));
  if (ldTypes(m.jsonLd) !== ldTypes(got.ld)) diffs.push(`jsonLd types want ${ldTypes(m.jsonLd)} got ${ldTypes(got.ld)}`);
  if (JSON.stringify(m.jsonLd) !== JSON.stringify(got.ld)) diffs.push("jsonLd content differs");
  if (got.h1 !== 1) diffs.push(`h1 count ${got.h1}`);
  const robotsWant = m.robots?.includes("noindex") ? "noindex" : "index";
  if (!(got.robots ?? "index").includes(robotsWant)) diffs.push(`robots want ${m.robots} got ${got.robots}`);
  if (diffs.length) problems++;
  console.log((diffs.length ? "DIFF " : "ok   ") + route.padEnd(42) + res.status + (diffs.length ? "\n      " + diffs.join("\n      ") : ""));
}
// Old .html addresses and other legacy paths
for (const p of ["/index.html", "/journeys.html", "/destinations/yala.html", "/guides/best-time-to-visit-sri-lanka.html", "/signature-journey.html", "/index", "/journeys/", "/CMR", "/sitemap.xml", "/robots.txt", "/google72b5d30f9bce65b2.html", "/images/hillcountry/day3.jpg", "/lankalux-logo.png"]) {
  const r = await fetch(base + p, { redirect: "manual" });
  console.log("path ".padEnd(5) + p.padEnd(44) + r.status + " " + (r.headers.get("location") ?? ""));
}
console.log(problems ? `${problems} page(s) with differences` : "all pages match");
