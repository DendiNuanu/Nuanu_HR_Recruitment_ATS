import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

// __dirname is not available in ESM; derive it from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  serverExternalPackages: ["bcryptjs", "pdf-parse", "pdfjs-dist"],
  experimental: {
    // Tree-shake large icon/animation libraries so only used exports are bundled
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  // Ensure Turbopack uses this project as the workspace root (avoids resolving
  // modules from parent directories when multiple lockfiles are present).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
