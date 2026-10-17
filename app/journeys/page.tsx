import index from "@/content/generated/journeys-index.json";
import { EnquiryButton } from "@/components/enquiry/Enquiry";
import { JourneyStack, StackCard } from "@/components/journey/JourneyStack";
import { Magnetic } from "@/components/motion/Magnetic";
import { JsonLd } from "@/components/seo/JsonLd";
import { Photo } from "@/components/ui/Photo";
import { RouteMap } from "@/components/ui/RouteMap";
import { JOURNEY_ROUTES, journey, type JourneySlug } from "@/lib/journeys";
import { buildMetadata } from "@/lib/meta";
import { photo } from "@/lib/photos";

export const metadata = buildMetadata("/journeys");
export const revalidate = 60;

export default async function JourneysPage() {
  const blocks = index.blocks.map((b) => {
    const slug = b.href.slice(1) as JourneySlug;
    return { ...b, slug, days: journey(slug).days.length, routes: JOURNEY_ROUTES[slug] };
  });
  const [photos, tea] = await Promise.all([
    Promise.all(blocks.map((b) => photo(b.image!, b.title))),
    photo("images/hq/tea-leaves.jpg", "Tea leaves in the hill country"),
  ]);

  return (
    <>
      <JsonLd route="/journeys" />
      <section className="bg-forest-950 pb-section pt-[calc(var(--header-h)+clamp(4rem,10vh,8rem))] text-ivory">
        <div className="wrap grid gap-10 lg:grid-cols-12 lg:items-end">
          <h1 data-split data-immediate className="text-[clamp(3.5rem,11vw,12rem)] leading-[0.88] tracking-[-0.04em] lg:col-span-8">
            {index.h1}
          </h1>
          <div className="lg:col-span-4">
            <p data-reveal data-immediate data-delay="0.3" className="text-statement leading-[1.3]">
              {index.lead}
            </p>
            <div
              data-reveal
              data-immediate
              data-delay="0.45"
              className="prose-lux mt-6 text-mist [&_a]:text-ivory"
              dangerouslySetInnerHTML={{ __html: index.intro }}
            />
          </div>
        </div>
      </section>

      <JourneyStack>
        {blocks.map((b, i) => (
          <StackCard key={b.href} href={b.href}>
            <Photo photo={photos[i]} sizes="(min-width: 768px) 100vw, 140vw" className="transition-transform duration-[1.6s] ease-[var(--ease-out-expo)] group-hover:scale-[1.03]" />
            <div className="scrim-bottom absolute inset-0" />
            <div className="absolute inset-0 bg-forest-950/20" />
            <div className="wrap relative flex h-full flex-col justify-end pb-[clamp(2rem,6vh,4.5rem)]">
              <div className="grid items-end gap-8 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <p className="text-[0.975rem] text-gold">
                    {b.tag} · {b.days} days
                  </p>
                  <h2 className="mt-3 max-w-[14ch] text-display leading-[0.95]">{b.title}</h2>
                  <p className="mt-6 max-w-[48ch] text-ivory/90">{b.desc}</p>
                  <span className="link-arrow mt-8">
                    Explore this journey <span className="btn-arrow">→</span>
                  </span>
                </div>
                <div className="hidden justify-end lg:col-span-4 lg:flex">
                  <RouteMap segments={b.routes.flatMap((r) => (r.path ? [r.path] : []))} className="h-[min(42vh,20rem)] w-auto" />
                </div>
              </div>
            </div>
          </StackCard>
        ))}
      </JourneyStack>

      <section className="relative overflow-hidden bg-forest-900 text-ivory">
        <div className="absolute inset-0">
          <div data-parallax="0.1" className="absolute -inset-y-[12%] inset-x-0">
            <Photo photo={tea} sizes="(min-width: 768px) 100vw, 140vw" className="brightness-[0.45]" />
          </div>
        </div>
        <div className="wrap relative grid min-h-[70svh] content-center gap-10 py-section lg:grid-cols-12">
          <p data-split className="font-display text-title leading-[1.05] lg:col-span-7">
            {index.footer}
          </p>
          <div data-reveal className="flex flex-wrap items-center gap-x-8 gap-y-5 lg:col-span-4 lg:col-start-9">
            <Magnetic>
              <EnquiryButton kind="booking" className="btn">
                Build my journey <span className="btn-arrow">→</span>
              </EnquiryButton>
            </Magnetic>
            <EnquiryButton kind="itinerary" className="link-arrow">
              I already have an itinerary <span className="btn-arrow">→</span>
            </EnquiryButton>
          </div>
        </div>
      </section>
    </>
  );
}
