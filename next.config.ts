import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["weaviate-client"],
  allowedDevOrigins: ['192.168.1.7', '127.0.0.1'],
  /* default "bottom-left" sits on top of the fixed TabBar/VoiceRail in dev */
  devIndicators: { position: "top-right" },
};

export default nextConfig;
