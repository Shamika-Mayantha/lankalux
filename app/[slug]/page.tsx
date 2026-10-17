import { notFound } from "next/navigation";
import { ArticlePage, ARTICLE_ROUTES } from "@/components/article/ArticlePage";
import { JourneyPage } from "@/components/journey/JourneyPage";
import { JOURNEY_SLUGS, type JourneySlug } from "@/lib/journeys";
import { buildMetadata } from "@/lib/meta";

// Top-level pages: the four journeys and the planning pages (tailor-made, chauffeur-guide, family, 10-day).
const ARTICLE_SLUGS = ARTICLE_ROUTES.filter((r) => r.split("/").length === 2).map((r) => r.slice(1));

export const dynamicParams = false;
export const revalidate = 60;

export function generateStaticParams() {
  return [...JOURNEY_SLUGS, ...ARTICLE_SLUGS].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return buildMetadata("/" + slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if ((JOURNEY_SLUGS as string[]).includes(slug)) return <JourneyPage slug={slug as JourneySlug} />;
  if (ARTICLE_SLUGS.includes(slug)) return <ArticlePage route={"/" + slug} />;
  notFound();
}
