import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { Header } from "@/components/chrome/Header";
import { Footer } from "@/components/chrome/Footer";
import { Concierge } from "@/components/concierge/Concierge";
import { CookieNotice } from "@/components/chrome/CookieNotice";
import { EnquiryProvider } from "@/components/enquiry/Enquiry";
import { Cursor } from "@/components/motion/Cursor";
import { MotionRoot } from "@/components/motion/MotionRoot";
import { PageTransition } from "@/components/motion/PageTransition";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const gambetta = localFont({
  src: [
    { path: "./fonts/Gambetta-Variable.woff2", style: "normal", weight: "300 700" },
    { path: "./fonts/Gambetta-VariableItalic.woff2", style: "italic", weight: "300 700" },
  ],
  variable: "--font-gambetta",
  display: "swap",
  fallback: ["Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});

const switzer = localFont({
  src: [{ path: "./fonts/Switzer-Variable.woff2", style: "normal", weight: "100 900" }],
  variable: "--font-switzer",
  display: "swap",
  fallback: ["system-ui", "Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Small tab icons; the original /lankalux-favicon.png stays published for anything that links to it.
  icons: {
    icon: [
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-48.png", type: "image/png", sizes: "48x48" },
    ],
    apple: "/apple-touch-icon.png",
  },
  other: { sitemap: `${SITE_URL}/sitemap.xml` },
};

export const viewport: Viewport = {
  themeColor: "#0e2219",
  width: "device-width",
  initialScale: 1,
};

// Google Analytics / Google Ads ids, read by /lankalux-analytics.js. The Ads tag id is public; Vercel env vars override it.
const tracking = {
  ga: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "",
  ads: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "AW-18540176984",
  labels: {
    generate_lead: process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL || "jaMkCLnquasdENjM0ohF",
    whatsapp_click: process.env.NEXT_PUBLIC_GOOGLE_ADS_WHATSAPP_LABEL || "",
  },
};
const trackingOn = Boolean(tracking.ga || tracking.ads);
const trackingScript = `window.LANKALUX_TRACKING=${JSON.stringify(tracking).replace(/</g, "\\u003c")};`;

// Before first paint: turn on the reveal system (unless reduced motion), hold the homepage
// for its preloader on the first visit, and give up on hiding anything if scripts fail.
const bootScript = `(function(){var d=document.documentElement;if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;d.classList.add('motion');try{if(location.pathname==='/'&&innerWidth>=1024&&!sessionStorage.getItem('lux-preloaded')){d.dataset.holdEnter='preloader';d.classList.add('preload')}}catch(e){}setTimeout(function(){if(!d.classList.contains('motion-ready')){d.classList.remove('motion','preload');delete d.dataset.holdEnter}},4000)})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${gambetta.variable} ${switzer.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        {trackingOn && <script dangerouslySetInnerHTML={{ __html: trackingScript }} />}
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SmoothScroll>
          <EnquiryProvider>
            <Header />
            <div id="page" className="relative bg-paper" style={{ zIndex: "var(--z-main)" }}>
              <main id="main">{children}</main>
            </div>
            <Footer />
            <Concierge />
            {trackingOn && <CookieNotice />}
            <PageTransition />
            <MotionRoot />
            <Cursor />
          </EnquiryProvider>
        </SmoothScroll>
        <Analytics />
        <Script src="/lankalux-analytics.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
