import home from "@/content/generated/home.json";
import journeysIndex from "@/content/generated/journeys-index.json";
import { Chapters, type Chapter } from "@/components/home/Chapters";
import { Fleet, type Vehicle } from "@/components/home/Fleet";
import { HomeHero } from "@/components/home/HomeHero";
import { JourneysStrip } from "@/components/home/JourneysStrip";
import { PlanNotRulebook } from "@/components/home/PlanNotRulebook";
import { Preloader } from "@/components/home/Preloader";
import { EnquiryButton } from "@/components/enquiry/Enquiry";
import { Magnetic } from "@/components/motion/Magnetic";
import { JsonLd } from "@/components/seo/JsonLd";
import { Photo } from "@/components/ui/Photo";
import { CurrentOffer } from "@/components/ui/CurrentOffer";
import { ReviewSlider } from "@/components/ui/ReviewSlider";
import { buildMetadata } from "@/lib/meta";
import { photo } from "@/lib/photos";
import { INSTAGRAM_URL } from "@/lib/site";
import { getReviews } from "@/lib/site-content";

export const metadata = buildMetadata("/");
export const revalidate = 60;

const CHAPTER_ROUTES: Record<string, { href: string; linkLabel: string; main: string; mainAlt: string }> = {
  cultural: { href: "/signature-journey", linkLabel: "The Signature Sri Lanka Journey", main: "images/highlights/cultural/sigirya.jpg", mainAlt: "Sigiriya Rock Fortress at dawn" },
  tea: { href: "/hill-country-journey", linkLabel: "The Hill Country & Scenic Rail Journey", main: "images/hillcountry/hillcountryhp.jpg", mainAlt: "The blue train through the hill country" },
  wildlife: { href: "/nature-wildlife-journey", linkLabel: "The Nature & Wildlife Discovery Journey", main: "images/highlights/wildlife/leopard.jpg", mainAlt: "A leopard in Yala National Park" },
  beach: { href: "/coastal-retreat-journey", linkLabel: "The Coastal Retreat Journey", main: "images/coastalretreat/coastalhp.jpg", mainAlt: "Palms over the south coast" },
};

/** From the road uses photos the chapters above do not, so nothing repeats on the scroll. */
const ROAD_CARDS = [
  { title: "Hill country", image: "images/hq/nine-arch-bridge.jpg", alt: "The Nine Arch Bridge near Ella" },
  { title: "On safari", image: "images/hq/elephants.jpg", alt: "Elephants on the plains" },
  { title: "The south coast", image: "images/hq/galle-lighthouse.jpg", alt: "The lighthouse at Galle Fort" },
];

type HighlightKey = keyof typeof home.highlights.data;
type VehicleKey = keyof typeof home.fleet.vehicles;

export default async function HomePage() {
  const h = home;

  const [heroPoster, aboutPhotos, chapters, journeyCards, vehicles, chauffeur, planBg, whyPhoto, roadCards, reviewBg, faqPhotos, reviews] = await Promise.all([
    photo("images/hq/tea-hills.jpg", "Mist over tea estates in Sri Lanka's hill country"),
    Promise.all([
      photo("images/homepage/homepage4.jpg", "Walking through a tea estate above a lake"),
      photo("images/homepage/homepage3.jpg", "A quiet beach on Sri Lanka's coast"),
      photo("images/homepage/homepage2.jpg", "Watching elephants from a safari jeep"),
      photo("images/homepage/homepage5.png", "A safari jeep beside elephants at Minneriya"),
    ]),
    Promise.all(
      h.highlights.order.map(async (key): Promise<Chapter> => {
        const data = h.highlights.data[key as HighlightKey];
        const route = CHAPTER_ROUTES[key];
        const extras = data.images.filter((i) => i !== route.main).slice(0, 2);
        return {
          key,
          title: data.title,
          description: data.description,
          href: route.href,
          linkLabel: route.linkLabel,
          main: await photo(route.main, route.mainAlt),
          extras: await Promise.all(extras.map((k) => photo(k, data.title))),
        };
      }),
    ),
    Promise.all(
      journeysIndex.blocks.map(async (b) => ({
        href: b.href,
        tag: b.tag,
        title: b.title,
        desc: b.desc,
        photo: await photo(b.image, b.title),
      })),
    ),
    Promise.all(
      h.fleet.order.map(async (key): Promise<Vehicle> => {
        const v = h.fleet.vehicles[key as VehicleKey] as { title: string; microLabel: string; badge?: string; description: string; images: string[] };
        return {
          key,
          title: v.title,
          microLabel: v.microLabel,
          badge: v.badge,
          description: v.description,
          photos: await Promise.all(v.images.map((k) => photo(k, v.title))),
        };
      }),
    ),
    photo(h.chauffeur.image!, "A LankaLux Toyota Voxy ready for the road"),
    photo("images/hq/coconut-tree-hill.jpg", "Coconut Tree Hill above the sea at Mirissa"),
    photo("images/signaturejourney/sigjhp1.jpg", "Sigiriya at first light"),
    Promise.all(ROAD_CARDS.map((c) => photo(c.image, c.alt))),
    photo("images/coastalretreat/day7.jpg", "Sunset on the ramparts of Galle Fort"),
    Promise.all([photo("images/hq/rainforest.jpg", "A stream through the rainforest"), photo("images/highlights/tea/gregorylake.jpg", "Gregory Lake in Nuwara Eliya")]),
    getReviews("home", h.reviews),
  ]);

  return (
    <>
      <JsonLd route="/" />
      <Preloader />

      <HomeHero
        lines={h.hero.lines}
        lead={h.hero.lead}
        points={h.hero.points}
        backdropSrc={heroPoster.src}
        poster={<Photo photo={heroPoster} priority sizes="(min-width: 768px) 100vw, 140vw" />}
      />

      {/* We start with you: the statement holds while photographs pass beside it. */}
      <section id="about" aria-labelledby="about-title" className="relative bg-paper">
        <div className="relative lg:h-[210svh]">
          <div className="wrap sticky top-0 flex min-h-svh flex-col justify-center py-24 lg:py-0">
            <div className="mx-auto max-w-[40rem] text-center">
              <h2 id="about-title" data-split className="text-title">
                We start with you, not a package.
              </h2>
              <p data-reveal className="mt-8 text-statement leading-[1.3]">
                {h.about.paragraphs[0]} {h.about.paragraphs[1]}
              </p>
              <p data-reveal className="mt-8 text-ink-soft">
                {h.about.paragraphs.slice(2).join(" ")}
              </p>
            </div>
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
            <div className="absolute left-[3vw] top-[12svh] aspect-[4/5] w-[19vw] overflow-hidden" data-clip>
              <div data-parallax="0.1" className="absolute -inset-y-[12%] inset-x-0"><Photo photo={aboutPhotos[0]} sizes="20vw" frameAspect={0.65} /></div>
            </div>
            <div className="absolute right-[3vw] top-[58svh] aspect-[4/5] w-[17vw] overflow-hidden" data-clip>
              <div data-parallax="0.12" className="absolute -inset-y-[12%] inset-x-0"><Photo photo={aboutPhotos[1]} sizes="18vw" frameAspect={0.65} /></div>
            </div>
            <div className="absolute left-[7vw] top-[118svh] aspect-square w-[14vw] overflow-hidden" data-clip>
              <div data-parallax="0.1" className="absolute -inset-y-[12%] inset-x-0"><Photo photo={aboutPhotos[2]} sizes="15vw" frameAspect={0.8} /></div>
            </div>
            <div className="absolute right-[6vw] top-[150svh] aspect-[16/11] w-[20vw] overflow-hidden" data-clip>
              <div data-parallax="0.1" className="absolute -inset-y-[12%] inset-x-0"><Photo photo={aboutPhotos[3]} sizes="21vw" frameAspect={1.17} /></div>
            </div>
          </div>
        </div>

        <div className="wrap pb-section">
          <ol data-reveal-group className="grid gap-x-12 gap-y-14 md:grid-cols-2 lg:grid-cols-4">
            {h.about.steps.map((s) => (
              <li key={s.title}>
                <h3 className="text-[1.75rem] leading-[1.1]">{s.title}</h3>
                <p className="mt-4 text-ink-soft">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The island in four chapters. */}
      <section aria-labelledby="highlights-title" className="bg-paper">
        <div className="wrap pb-16">
          <h2 id="highlights-title" data-split className="text-display leading-[0.95]">
            {h.highlights.title}
          </h2>
        </div>
        <Chapters chapters={chapters} />
      </section>

      <JourneysStrip title={h.journeys.title} intro={h.journeys.intro} journeys={journeyCards} />

      {/* Why LankaLux and the practical side, side by side with one photograph. */}
      <section id="why" aria-labelledby="why-title" className="bg-ivory py-section">
        <div className="wrap grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 id="why-title" data-split className="text-display leading-[0.95]">
              {h.why.title}
            </h2>
            <div className="relative mt-12 aspect-[4/5] overflow-hidden" data-clip>
              <Photo photo={whyPhoto} sizes="(min-width: 1024px) 40vw, 100vw" frameAspect={0.8} />
            </div>
          </div>
          <div className="lg:col-span-6 lg:col-start-7 lg:pt-6">
            <div id="services" className="bg-paper p-[clamp(1.5rem,3vw,3rem)]">
              <h2 data-split className="max-w-[18ch] text-[clamp(1.75rem,2.6vw,2.5rem)] leading-[1.08]">
                {h.services.title}
              </h2>
              <dl data-reveal-group className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
                {h.services.items.map((s) => (
                  <div key={s.title}>
                    <dt className="font-medium">{s.title}</dt>
                    <dd className="mt-2 text-ink-soft">{s.text}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Already planning Sri Lanka? */}
      <section id="itinerary-review" aria-labelledby="review-title" className="bg-forest-700 py-section text-ivory">
        <div className="wrap grid items-end gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 id="review-title" data-split className="text-display leading-[0.95]">
              {h.itineraryReview.title}
            </h2>
            <p data-reveal className="mt-8 text-statement leading-[1.25]">
              {h.itineraryReview.lead}
            </p>
          </div>
          <div data-reveal className="lg:col-span-4 lg:col-start-9">
            {h.itineraryReview.paragraphs.map((p) => (
              <p key={p} className="mt-3 text-ivory/90 first:mt-0">
                {p}
              </p>
            ))}
            <div className="mt-10">
              <Magnetic>
                <EnquiryButton kind="itinerary" className="btn btn-ivory">
                  Review my itinerary <span className="btn-arrow">→</span>
                </EnquiryButton>
              </Magnetic>
            </div>
          </div>
        </div>
      </section>

      {/* More than assigning a driver. */}
      <section id="chauffeur" aria-labelledby="chauffeur-title" className="bg-paper">
        <div className="grid lg:min-h-svh lg:grid-cols-2">
          <div className="relative min-h-[70svh] overflow-hidden lg:order-2" data-clip>
            <div data-parallax="0.08" className="absolute -inset-y-[10%] inset-x-0">
              <Photo photo={chauffeur} sizes="(min-width: 1024px) 50vw, 100vw" frameAspect={0.67} />
            </div>
          </div>
          <div className="wrap flex flex-col justify-center py-section lg:px-[6vw]">
            <h2 id="chauffeur-title" data-split className="max-w-[12ch] text-display leading-[0.95]">
              {h.chauffeur.title}
            </h2>
            <div data-reveal-group className="mt-10 max-w-[48ch] space-y-5">
              {h.chauffeur.paragraphs.map((p) =>
                p.strong ? (
                  <p key={p.text} className="pt-6 font-display text-statement leading-[1.2]">
                    {p.text}
                  </p>
                ) : (
                  <p key={p.text} className="text-ink-soft">
                    {p.text}
                  </p>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* The fleet. */}
      <section id="fleet" aria-labelledby="fleet-title" className="bg-ivory py-section">
        <div className="wrap mb-14 grid gap-8 lg:grid-cols-12 lg:items-end">
          <h2 id="fleet-title" data-split className="text-display leading-[0.95] lg:col-span-7">
            {h.fleet.title}
          </h2>
          <p data-reveal className="text-ink-soft lg:col-span-4 lg:col-start-9">
            {h.fleet.lead} Drag or swipe to see each vehicle.
          </p>
        </div>
        <Fleet vehicles={vehicles} />
      </section>

      <PlanNotRulebook title={h.flexibility.title} paragraphs={h.flexibility.paragraphs} background={<Photo photo={planBg} sizes="(min-width: 768px) 100vw, 140vw" />} />

      {/* Travel with clarity. */}
      <section id="promise" aria-labelledby="promise-title" className="bg-paper py-section">
        <div className="wrap grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 id="promise-title" data-split className="text-display leading-[0.95]">
              {h.promise.title}
            </h2>
            <p data-reveal className="mt-8 max-w-[34ch] text-statement leading-[1.25]">
              {h.promise.lead}
            </p>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <ul data-reveal-group className="divide-y-0">
              {h.promise.items.map((item) => (
                <li key={item} className="py-4 font-display text-[clamp(1.5rem,2.2vw,2.125rem)] leading-[1.15]">
                  {item}
                </li>
              ))}
            </ul>
            <p data-reveal className="mt-10 max-w-[50ch] bg-sand p-6 text-ink-soft">
              {h.promise.note}
            </p>
          </div>
        </div>
      </section>

      {/* One thing we will not put on your itinerary. */}
      <section id="moment" aria-labelledby="moment-title" className="bg-ivory py-section">
        <div className="wrap">
          <h2 id="moment-title" data-split className="max-w-[20ch] text-title">
            {h.moment.title}
          </h2>
          <div className="mt-14 grid gap-10 lg:grid-cols-12">
            <p data-reveal className="text-statement leading-[1.3] lg:col-span-6">
              {h.moment.paragraphs[0]} {h.moment.paragraphs[1]}
            </p>
            <p data-reveal className="text-ink-soft lg:col-span-4 lg:col-start-9">
              {h.moment.paragraphs.slice(2).join(" ")}
            </p>
          </div>
        </div>
      </section>

      {/* From the road. */}
      <section id="from-the-road" aria-labelledby="road-title" className="bg-paper py-section">
        <div className="wrap">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 id="road-title" data-split className="text-title">
                {h.fromTheRoad.title}
              </h2>
              <p data-reveal className="mt-4 text-ink-soft">
                {h.fromTheRoad.lead}
              </p>
            </div>
            <a data-reveal className="link-arrow" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              Follow @lanka.lux on Instagram <span className="btn-arrow">→</span>
            </a>
          </div>
          <div className="mt-14 grid gap-4 md:grid-cols-12">
            {ROAD_CARDS.map((c, i) => (
              <a
                key={c.title}
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative block overflow-hidden ${i === 0 ? "aspect-[4/5] md:col-span-5" : i === 1 ? "aspect-[4/5] md:col-span-4 md:mt-24" : "aspect-[4/5] md:col-span-3 md:mt-48"}`}
                data-clip
              >
                <Photo photo={roadCards[i]} sizes="(min-width: 768px) 40vw, 100vw" frameAspect={0.8} className="transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.05]" />
                <span className="scrim-bottom absolute inset-0" />
                <span className="absolute bottom-5 left-5 font-display text-[1.75rem] text-ivory">{c.title}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews: one at a time over a photograph. */}
      <section aria-labelledby="reviews-title" className="relative overflow-hidden bg-forest-950 text-ivory">
        <div className="absolute inset-0">
          <div data-parallax="0.08" className="absolute -inset-y-[10%] inset-x-0">
            <Photo photo={reviewBg} sizes="(min-width: 768px) 100vw, 140vw" />
          </div>
        </div>
        <div className="absolute inset-0 bg-forest-950/70" />
        <div className="wrap relative grid min-h-[90svh] content-center gap-12 py-section lg:grid-cols-12">
          <h2 id="reviews-title" data-split className="text-title lg:col-span-4">
            {h.reviewsTitle}
          </h2>
          <div data-reveal className="lg:col-span-7 lg:col-start-6">
            <ReviewSlider reviews={reviews} />
          </div>
        </div>
      </section>


      {/* Practical answers beside a tall photograph. */}
      <section id="faq" aria-labelledby="faq-title" className="bg-forest-900 text-ivory">
        <div className="wrap grid gap-16 py-section lg:grid-cols-12">
          <div className="lg:col-span-6">
            <h2 id="faq-title" data-split className="text-title">
              {h.faq.title}
            </h2>
            <CurrentOffer className="mt-10 max-w-[38rem]" />
            <div data-reveal-group className="mt-12">
              {h.faq.items.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-2 font-display text-[clamp(1.375rem,1.9vw,1.75rem)] leading-[1.2] [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span aria-hidden="true" className="relative mt-3 size-4 shrink-0">
                      <span className="absolute left-0 top-1/2 h-px w-4 bg-current" />
                      <span className="absolute left-0 top-1/2 h-px w-4 rotate-90 bg-current transition-transform duration-500 group-open:rotate-0" />
                    </span>
                  </summary>
                  <p className="prose-lux pb-4 pt-2 text-ivory/85 [&_a]:text-ivory" dangerouslySetInnerHTML={{ __html: f.a }} />
                </details>
              ))}
            </div>
          </div>
          <div className="relative hidden lg:col-span-5 lg:col-start-8 lg:block">
            <div className="sticky top-[12vh]">
              <div className="relative aspect-[3/4] overflow-hidden" data-clip>
                <Photo photo={faqPhotos[0]} sizes="40vw" frameAspect={0.75} />
              </div>
              <div className="relative -mt-24 ml-[-3rem] aspect-square w-1/2 overflow-hidden" data-clip>
                <Photo photo={faqPhotos[1]} sizes="20vw" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
