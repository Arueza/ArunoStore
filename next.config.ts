import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Partial Prerendering. Every route is prerendered to a static shell at build
  // time and served from the CDN, with anything that reads the session
  // streaming in behind a <Suspense> boundary. Without this, reading cookies in
  // the root layout made every page dynamic, including the two auth pages that
  // have no session to read.
  cacheComponents: true,
};

export default nextConfig;
