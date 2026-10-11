import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components: `"use cache"` (the forecast cache in
  // src/weather/forecast-cache.ts) needs it. Every page here depends on who is
  // logged in, so each page prerenders only a static shell and the rest
  // streams in behind <Suspense> once the session cookie is read.
  cacheComponents: true,
};

export default nextConfig;
