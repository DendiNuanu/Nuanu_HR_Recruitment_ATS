import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
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
  // Opt native/Node.js-only packages out of the server-component bundle
  // so they are required via native Node.js require() instead of being
  // webpack-bundled (which breaks binary addons and large native deps).
  serverExternalPackages: ["bcryptjs", "pdf-parse"],
};

export default nextConfig;
