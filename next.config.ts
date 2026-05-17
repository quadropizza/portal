import type { NextConfig } from "next";

const config: NextConfig = {
  experimental: {
    typedRoutes: true,
    serverActions: {
      bodySizeLimit: "10mb", // PDFs do Fast Report ~ 3MB
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default config;
