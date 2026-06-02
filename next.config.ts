import path from "path";
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
    formats: ["image/avif", "image/webp"],
  },
  serverExternalPackages: ["bcryptjs", "pdf-parse"],
  experimental: {
    // Tree-shake large icon/animation libraries so only used exports are bundled
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  // Ensure Turbopack uses this project as the workspace root (avoids resolving
  // modules from parent directories when multiple lockfiles are present).
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
