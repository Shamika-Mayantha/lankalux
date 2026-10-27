import type { NextConfig } from "next";
import meta from "./content/generated/meta.json";

// Every page that existed as a static .html file keeps answering on its old .html URL.
const htmlRedirects = Object.keys(meta).map((route) => ({
  source: route === "/" ? "/index.html" : `${route}.html`,
  destination: route,
  statusCode: 301 as const,
}));

const nextConfig: NextConfig = {
  agentRules: false,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75],
    deviceSizes: [640, 828, 1080, 1440, 1920, 2560, 3200],
    imageSizes: [96, 256, 384, 512],
    minimumCacheTTL: 2678400,
    // Photos replaced from admin.lankalux.com are stored in Supabase Storage.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "admin.lankalux.com" },
    ],
  },
  async redirects() {
    return [
      ...htmlRedirects,
      { source: "/index", destination: "/", statusCode: 301 as const },
      // The fleet lives on the homepage; people type lankalux.com/fleet.
      { source: "/fleet", destination: "/#fleet", statusCode: 308 as const },
    ];
  },
};

export default nextConfig;
