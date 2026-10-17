import type { Metadata } from "next";
import pages from "@/content/generated/meta.json";

type PageMeta = (typeof pages)[keyof typeof pages];

export function pageMeta(route: string): PageMeta {
  const m = (pages as Record<string, PageMeta>)[route];
  if (!m) throw new Error(`No metadata recorded for ${route}`);
  return m;
}

/** The exact title, description, canonical, Open Graph and Twitter tags the static page had. */
export function buildMetadata(route: string): Metadata {
  const m = pageMeta(route);
  const robots = m.robots ? { index: !m.robots.includes("noindex"), follow: !m.robots.includes("nofollow") } : undefined;
  return {
    title: { absolute: m.title },
    description: m.description ?? undefined,
    robots,
    alternates: m.canonical ? { canonical: m.canonical } : undefined,
    openGraph: m.og.title
      ? {
          type: (m.og.type as "website") ?? "website",
          url: m.og.url ?? undefined,
          title: m.og.title,
          description: m.og.description ?? undefined,
          siteName: m.og.siteName ?? undefined,
          locale: m.og.locale ?? undefined,
          images: m.og.image ? [{ url: m.og.image, alt: m.og.imageAlt ?? undefined }] : undefined,
        }
      : undefined,
    twitter: m.twitter.card
      ? {
          card: m.twitter.card as "summary_large_image",
          title: m.twitter.title ?? undefined,
          description: m.twitter.description ?? undefined,
          images: m.twitter.image ? [m.twitter.image] : undefined,
        }
      : undefined,
  };
}

export function jsonLd(route: string): object[] {
  return pageMeta(route).jsonLd as object[];
}
