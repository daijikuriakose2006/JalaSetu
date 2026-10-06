import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PWA headers
  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800",
          },
        ],
      },
    ];
  },

  // Security: don't expose env to browser
  serverExternalPackages: ["nodemailer"],

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
