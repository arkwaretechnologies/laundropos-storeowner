import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix workspace root detection issue
  // Explicitly set the root to the Next.js project directory
  outputFileTracingRoot: path.resolve(__dirname || process.cwd()),
};

export default nextConfig;




