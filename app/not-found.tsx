import Link from "next/link";
import { RouteMap } from "@/components/ui/RouteMap";
import { buildMetadata } from "@/lib/meta";

export const metadata = buildMetadata("/404");

export default function NotFound() {
  return (
    <section className="flex min-h-svh items-center bg-forest-950 pb-24 pt-[calc(var(--header-h)+4rem)] text-ivory">
      <div className="wrap grid items-center gap-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h1 className="text-display leading-[0.95]">This page is not here</h1>
          <p className="mt-8 max-w-[44ch] text-statement leading-[1.3] text-ivory/90">
            The link may be out of date. You can return home or browse our journeys.
          </p>
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-5">
            <Link href="/" className="btn">
              Return home <span className="btn-arrow">→</span>
            </Link>
            <Link href="/journeys" className="link-arrow">
              View journeys <span className="btn-arrow">→</span>
            </Link>
          </div>
        </div>
        <div className="hidden justify-center lg:col-span-4 lg:col-start-9 lg:flex">
          <RouteMap segments={[]} className="h-[min(60vh,30rem)] w-auto" />
        </div>
      </div>
    </section>
  );
}
