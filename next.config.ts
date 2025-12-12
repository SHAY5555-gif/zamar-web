import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Set turbopack root to monorepo root for proper module resolution
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  // Transpile shared package
  transpilePackages: ["@zamar/shared"],
};

export default nextConfig;
