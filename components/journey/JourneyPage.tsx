import Link from "next/link";
import { EnquiryButton } from "@/components/enquiry/Enquiry";
import { Magnetic } from "@/components/motion/Magnetic";
import { JsonLd } from "@/components/seo/JsonLd";
import { Photo } from "@/components/ui/Photo";
import { CurrentOffer } from "@/components/ui/CurrentOffer";
import { ReviewSlider } from "@/components/ui/ReviewSlider";
import { INCLUDED, JOURNEY_ROUTES, JOURNEY_SLUGS, NOT_INCLUDED, journey, type JourneySlug } from "@/lib/journeys";
import { photo } from "@/lib/photos";
import { PLACE_NAMES, type Place } from "@/lib/route";
import { whatsappLink } from "@/lib/site";
import { getReviews } from "@/lib/site-content";
import { Itinerary } from "./Itinerary";
import { JourneyHero } from "./JourneyHero";

/** Consecutive days in the same place, e.g. Yala · Days 6–7. */
function stays(routes: { stay: Place }[]) {
  const out: { place: Place; from: number; to: number }[] = [];
  routes.forEach((r, i) => {
    const last = out[out.length - 1];
    if (last && last.place === r.stay) last.to = i + 1;
    else out.push({ place: r.stay, from: i + 1, to: i + 1 });
  });
  return out;
}

export async function JourneyPage({ slug }: { slug: JourneySlug }) {
  const j = journey(slug);
  const routes = JOURNEY_ROUTES[slug];
  const others = JOURNEY_SLUGS.filter((s) => s !== slug).map(journey);

  const [hero, days, reviews, reviewBg, otherPhotos] = await Promise.all([
    photo(j.heroImage!, j.h1),
    Promise.all(j.days.map(async (d) => ({ ...d, photo: await photo(d.image!, d.alt) }))),
    getReviews(slug, j.reviews),
    photo(j.days[Math.min(j.days.length - 2, 6)].image!, ""),
    Promise.all(others.map((o) => photo(o.cover, o.h1))),
  ]);

  const places = stays(routes).filter((s) => s.place !== "airport");
  const facts = [
    { label: "Length", value: `${j.days.length} days` },
    { label: "Style", value: j.tag },
  ];

  return (
    <>
      <JsonLd route={"/" + slug} />
      <JourneyHero title={j.h1} lead={j.lead} facts={facts} photo={<Photo photo={hero} priority sizes="(min-width: 768px) 106vw, 140vw" />} />

      <section aria-labelledby="days-title" className="bg-paper">
        <div className="wrap py-section">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
            <h2 id="days-title" data-split className="text-display leading-[0.95] lg:col-span-7">
              Day by day
            </h2>
            <p data-reveal className="text-statement leading-[1.3] lg:col-span-5">
              {j.summary}
            </p>
          </div>
        </div>
        <Itinerary days={days} routes={routes} />
      </section>

      {/* The shape of the journey. */}
      <section aria-labelledby="places-title" className="bg-ivory py-section">
        <div className="wrap grid gap-14 lg:grid-cols-12">
          <h2 id="places-title" data-split className="text-title lg:col-span-4">
            Where the nights are
          </h2>
          <ol data-reveal-group className="lg:col-span-7 lg:col-start-6">
            {places.map((p) => (
              <li key={p.place + p.from} className="flex items-baseline justify-between gap-6 py-3">
                <span className="font-display text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.1]">{PLACE_NAMES[p.place]}</span>
                <span className="shrink-0 text-ink-soft tabular-nums">{p.from === p.to ? `Day ${p.from}` : `Days ${p.from}–${p.to}`}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What is and is not included. */}
      <section aria-labelledby="included-title" className="bg-forest-900 py-section text-ivory">
        <div className="wrap grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 id="included-title" data-split className="text-title">
              What every journey includes
            </h2>
            <p data-reveal className="mt-6 max-w-[40ch] text-mist">
              These are starting points, not fixed packages. We reshape the route, pace and stays around you.
            </p>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <ul data-reveal-group className="space-y-4">
              {INCLUDED.map((item) => (
                <li key={item} className="flex gap-4 font-display text-[clamp(1.375rem,2vw,1.875rem)] leading-[1.2]">
                  <span aria-hidden="true" className="mt-[0.45em] size-2 shrink-0 rounded-full bg-gold" />
                  {item}
                </li>
              ))}
            </ul>
            <p data-reveal className="mt-12 max-w-[56ch] text-ivory/85">
              {NOT_INCLUDED}
            </p>
            <CurrentOffer className="mt-8" />
          </div>
        </div>
      </section>

      {/* Guests on this journey. */}
      <section aria-labelledby="journey-reviews" className="relative overflow-hidden bg-forest-950 text-ivory">
        <div className="absolute inset-0">
          <div data-parallax="0.08" className="absolute -inset-y-[10%] inset-x-0">
            <Photo photo={reviewBg} sizes="(min-width: 768px) 100vw, 140vw" />
          </div>
        </div>
        <div className="absolute inset-0 bg-forest-950/72" />
        <div className="wrap relative grid min-h-[80svh] content-center gap-12 py-section lg:grid-cols-12">
          <h2 id="journey-reviews" data-split className="text-title lg:col-span-4">
            {j.reviewsTitle}
          </h2>
          <div data-reveal className="lg:col-span-7 lg:col-start-6">
            <ReviewSlider reviews={reviews} />
          </div>
        </div>
      </section>

      {/* Book, or look at the others. */}
      <section aria-labelledby="book-title" className="bg-paper py-section">
        <div className="wrap">
          <h2 id="book-title" data-split className="max-w-[18ch] text-display leading-[0.95]">
            {j.bookLabel.charAt(0) + j.bookLabel.slice(1).toLowerCase()}
          </h2>
          <div data-reveal className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-5">
            <Magnetic>
              <EnquiryButton kind="journey" journey={j.h1} className="btn btn-forest">
                Send an enquiry <span className="btn-arrow">→</span>
              </EnquiryButton>
            </Magnetic>
            <a className="link-arrow" href={whatsappLink(`Hi LankaLux, I'm interested in the ${j.h1}.`)} target="_blank" rel="noopener noreferrer">
              Ask on WhatsApp <span className="btn-arrow">→</span>
            </a>
          </div>

          <h2 className="mt-section font-display text-[clamp(1.75rem,2.6vw,2.5rem)]">Other journeys</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {others.map((o, i) => (
              <Link key={o.slug} href={"/" + o.slug} className="group block">
                <span data-clip className="relative block aspect-[4/5] overflow-hidden">
                  <Photo photo={otherPhotos[i]} sizes="(min-width: 768px) 33vw, 100vw" frameAspect={0.8} className="transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.05]" />
                </span>
                <span className="mt-4 block text-[0.95rem] text-forest-700">{o.tag}</span>
                <span className="mt-1 block font-display text-[1.75rem] leading-tight">{o.h1}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
