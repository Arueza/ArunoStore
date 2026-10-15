import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : "";

const nextConfig: NextConfig = {
  // Partial Prerendering. Every route is prerendered to a static shell at build
  // time and served from the CDN, with anything that reads the session
  // streaming in behind a <Suspense> boundary. Without this, reading cookies in
  // the root layout made every page dynamic, including the two auth pages that
  // have no session to read.
  cacheComponents: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname,
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: supabaseHostname,
        pathname: "/storage/v1/object/sign/**",
      },
    ],
  },

  async redirects() {
    return [
      {
        source: "/shop/orders/:id",
        destination: "/checkout?type=shop&id=:id",
        permanent: true,
      },
      {
        source: "/shop/commission",
        destination: "/shop?side=commission",
        permanent: true,
      },
      {
        source: "/shop/titipan",
        destination: "/shop?side=titipan",
        permanent: true,
      },
      // 5.23 retired the section catalogues into the filtered global shop;
      // bookmarks and habits aimed at the old pages land on their filter.
      {
        source: "/commissions/catalog",
        destination: "/shop?side=commission",
        permanent: true,
      },
      {
        source: "/titipan/catalog",
        destination: "/shop?side=titipan",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
