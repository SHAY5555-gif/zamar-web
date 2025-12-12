import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Turbopack - has issues with Hebrew folder names
  turbopack: false,
};

export default nextConfig;
