import type { NextConfig } from "next";

const backendUrl = process.env.API_BACKEND_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  rewrites: async () => [
    {
      source: "/api/:path*",
      destination: `${backendUrl}/api/:path*`,
    },
  ],
};

export default nextConfig;
