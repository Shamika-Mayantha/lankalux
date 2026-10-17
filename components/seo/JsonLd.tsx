import { jsonLd } from "@/lib/meta";

/** The structured data blocks the original page carried, unchanged. */
export function JsonLd({ route }: { route: string }) {
  return (
    <>
      {jsonLd(route).map((block, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(block).replace(/</g, "\\u003c") }} />
      ))}
    </>
  );
}
