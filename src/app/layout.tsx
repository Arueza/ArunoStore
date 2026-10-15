import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { NavigationProgress, PageEnter } from "@/components/RouteFeedback";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Aruno Store — art commissions and titipan from Japan",
  description: "Art commissions and titipan from Japan, in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${playfair.variable}`}
    >
      <body className="flex min-h-dvh flex-col bg-cream text-ink antialiased">
        <NavigationProgress />
        <Navbar />
        {/* flex-1 keeps the footer at the foot of the page on short pages.
            PageEnter reads the pathname, a runtime value, so it suspends
            during prerender — the fallback holds the same shell with no
            animation, and the animated wrapper takes over on the client. */}
        <Suspense
          fallback={<div className="flex flex-1 flex-col">{children}</div>}
        >
          <PageEnter>{children}</PageEnter>
        </Suspense>
        <Footer />
      </body>
    </html>
  );
}
