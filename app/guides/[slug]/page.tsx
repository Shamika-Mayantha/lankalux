import { ArticlePage, ARTICLE_ROUTES } from "@/components/article/ArticlePage";
import { buildMetadata } from "@/lib/meta";

const SECTION = "/guides/";

export const dynamicParams = false;
export const revalidate = 60;

export function generateStaticParams() {
  return ARTICLE_ROUTES.filter((r) => r.startsWith(SECTION)).map((r) => ({ slug: r.slice(SECTION.length) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return buildMetadata(SECTION + slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ArticlePage route={SECTION + slug} />;
}
