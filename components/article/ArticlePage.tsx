import Link from "next/link";
import articles from "@/content/generated/articles.json";
import { EnquiryButton } from "@/components/enquiry/Enquiry";
import { JsonLd } from "@/components/seo/JsonLd";
import { CurrentOffer } from "@/components/ui/CurrentOffer";
import { Photo } from "@/components/ui/Photo";
import { photo } from "@/lib/photos";

type Article = (typeof articles)[keyof typeof articles];
export const ARTICLE_ROUTES = Object.keys(articles);

// Pages whose opening photograph is one of the high-resolution redesign photos (all admin slots).
const HERO: Record<string, { key: string; alt: string; position?: string }> = {
  "/destinations/ella": { key: "images/hq/nine-arch-bridge.jpg", alt: "The Nine Arch Bridge near Ella", position: "78% 50%" },
  "/destinations/mirissa": { key: "images/hq/coconut-tree-hill.jpg", alt: "Coconut Tree Hill above the sea at Mirissa" },
  "/destinations/galle": { key: "images/hq/galle-lighthouse.jpg", alt: "Galle Fort lighthouse at dusk" },
  "/destinations/udawalawe": { key: "images/hq/elephants.jpg", alt: "Elephants at a waterhole in Udawalawe" },
  "/guides/best-time-to-visit-sri-lanka": { key: "images/hq/coast-bay.jpg", alt: "A palm-lined bay on Sri Lanka's south coast" },
};

/** Section headings of the article body, for the contents list beside it. */
function headings(html: string) {
  return Array.from(html.matchAll(/<h2>(.*?)<\/h2>/g)).map((m, i) => ({ id: `s${i + 1}`, text: m[1].replace(/<[^>]+>/g, "") }));
}

function withIds(html: string) {
  let i = 0;
  return html.replace(/<h2>/g, () => `<h2 id="s${++i}" data-reveal>`).replace(/<p>/g, "<p data-reveal>");
}

/**
 * Destination, guide and planning pages: a parallax opening photograph, then calm, readable text
 * with its contents alongside. Motion stays light here; reading comes first.
 */
export async function ArticlePage({ route }: { route: string }) {
  const a = (articles as Record<string, Article>)[route];
  const [hero, related] = await Promise.all([
    HERO[route] ? photo(HERO[route].key, HERO[route].alt) : photo(a.heroImage!, a.heroAlt ?? a.h1),
    Promise.all(a.related.map((r) => photo(r.image!, r.label))),
  ]);
  const toc = headings(a.body);

  return (
    <>
      <JsonLd route={route} />
      <section className="relative flex min-h-[86svh] flex-col justify-end overflow-hidden bg-forest-950 text-ivory">
        <div className="absolute inset-0 overflow-hidden">
          <div data-parallax="0.1" className="absolute -inset-y-[10%] inset-x-0">
            <Photo photo={hero} priority sizes="(min-width: 768px) 100vw, 112vw" position={HERO[route]?.position} />
          </div>
        </div>
        <div className="scrim-bottom absolute inset-0" />
        <div className="wrap relative pb-[clamp(2.5rem,7vh,5rem)] pt-40">
          <h1 data-split data-immediate className="max-w-[16ch] text-display leading-[0.95]">
            {a.h1}
          </h1>
          <p data-reveal data-immediate data-delay="0.35" className="mt-6 max-w-[40ch] text-statement leading-[1.3] text-ivory/90">
            {a.lead}
          </p>
        </div>
      </section>

      <div className="bg-paper py-section">
        <div className="wrap grid gap-14 lg:grid-cols-12">
          {toc.length > 2 && (
            <nav aria-label="On this page" className="hidden lg:col-span-3 lg:block">
              <div className="sticky top-28">
                <p className="font-display text-[1.25rem]">On this page</p>
                <ul className="mt-4 space-y-2 text-[0.975rem] text-ink-soft">
                  {toc.map((h) => (
                    <li key={h.id}>
                      <a href={`#${h.id}`} className="link-arrow py-1 hover:text-ink">
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          )}
          <div className={toc.length > 2 ? "lg:col-span-8 lg:col-start-5" : "lg:col-span-8 lg:col-start-3"}>
          <article className="prose-lux" dangerouslySetInnerHTML={{ __html: withIds(a.body) }} />
          <CurrentOffer tone="light" className="mt-14 max-w-[66ch]" />
          </div>
        </div>

        <div className="wrap mt-section">
          {a.related.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {a.related.map((r, i) => (
                <Link key={r.href} href={r.href} className="group relative block aspect-[16/10] overflow-hidden" data-clip>
                  <Photo photo={related[i]} sizes="(min-width: 768px) 50vw, 100vw" className="transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.05]" />
                  <span className="scrim-bottom absolute inset-0" />
                  <span className="absolute bottom-6 left-6 font-display text-[clamp(1.75rem,3vw,2.75rem)] text-ivory">
                    {r.label} <span className="btn-arrow inline-block">→</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
          <div data-reveal className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-5">
            {a.actions.map((act) =>
              act.primary ? (
                <a key={act.href} className="btn btn-forest" href={act.href} target={act.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                  {act.label} <span className="btn-arrow">→</span>
                </a>
              ) : (
                <Link key={act.href} className="link-arrow" href={act.href}>
                  {act.label} <span className="btn-arrow">→</span>
                </Link>
              ),
            )}
            <EnquiryButton kind="booking" className="link-arrow">
              Plan a tailor-made journey <span className="btn-arrow">→</span>
            </EnquiryButton>
          </div>
        </div>
      </div>
    </>
  );
}
