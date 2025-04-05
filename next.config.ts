import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */ images: {
    unoptimized: true, // Disable image optimization
  },
  eslint: {
    ignoreDuringBuilds: true, // Skip ESLint during builds
  },
};

export default nextConfig;
