import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Los logos de equipos pueden venir de URLs externas en el futuro.
  // De momento permitimos cualquier host https para el campo logoUrl.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
