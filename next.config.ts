import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gzip/Brotli compress all responses
  compress: true,
  // Don't leak server info
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.nuanu.com",
      },
    ],
  },
  serverExternalPackages: ["bcryptjs", "pdf-parse"],
  experimental: {
    // Tree-shake large icon/animation libraries so only used exports are bundled
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
