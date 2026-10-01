import type { Metadata } from "next";
import "./globals.css";

// ponytail: placeholder metadata. Roadmap 0.3 sets the real title and fonts.
export const metadata: Metadata = {
  title: "Aruno Store",
  description: "Art commissions and titipan from Japan, in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}