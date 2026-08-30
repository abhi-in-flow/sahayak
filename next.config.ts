import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["weaviate-client"],
  allowedDevOrigins: ['192.168.1.7'],
};

export default nextConfig;
