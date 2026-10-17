import Link from "next/link";
import { EnquiryButton } from "@/components/enquiry/Enquiry";
import { Magnetic } from "@/components/motion/Magnetic";
import { DESTINATION_LINKS, EMAIL, FACEBOOK_URL, GUIDE_LINKS, INSTAGRAM_URL, JOURNEY_LINKS, PLANNING_LINKS, WHATSAPP_URL } from "@/lib/site";
import { Logo } from "./Logo";

/**
 * Sits underneath the page and is uncovered as the last section scrolls away
 * (sticky on large screens where it fits in one viewport).
 */
export function Footer() {
  return (
    <footer
      className="lux-footer relative flex min-h-svh flex-col bg-forest-900 text-ivory"
      style={{ zIndex: "var(--z-footer)" }}
    >
      <div className="wrap flex flex-1 flex-col pb-8 pt-[clamp(6rem,10vw,9rem)]">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="max-w-[22ch] text-title">Tell us how you want to experience Sri Lanka.</h2>
            <p className="mt-6 max-w-[44ch] text-mist">
              You do not need to know the perfect route yet. Tell us your dates, interests and travel style. We will help shape the rest.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
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

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 text-[0.95rem] sm:grid-cols-4 lg:col-span-5 lg:grid-cols-2 lg:pt-3">
            <FooterList title="Journeys" links={JOURNEY_LINKS} />
            <FooterList title="Planning" links={PLANNING_LINKS} />
            <FooterList title="Destinations" links={DESTINATION_LINKS} />
            <FooterList title="Guides" links={GUIDE_LINKS} />
          </nav>
        </div>

        <div className="mt-auto pt-20">
          <a
            href={`mailto:${EMAIL}`}
            className="block w-fit font-display text-[clamp(2.4rem,8.6vw,10rem)] leading-[0.95] tracking-[-0.035em] transition-colors duration-500 hover:text-gold"
          >
            {EMAIL}
          </a>
          <div className="mt-10 flex flex-col gap-5 text-[0.875rem] text-mist md:flex-row md:items-center md:justify-between">
            <Link href="/" aria-label="LankaLux home">
              <Logo markClass="size-7" />
            </Link>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              <li><a className="link-arrow" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>
              <li><a className="link-arrow" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Instagram</a></li>
              <li><a className="link-arrow" href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">Facebook</a></li>
            </ul>
            <p>Based in Sri Lanka · © 2026 LankaLux. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterList({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="mb-3 font-display text-[1.25rem] text-gold">{title}</p>
      <ul className="space-y-1.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} prefetch={false} className="link-arrow py-0.5">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
