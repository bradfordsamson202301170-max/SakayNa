import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "SakayNa — Iligan City Motorcycle Ride-Hailing & Driver Platform",
    template: "%s | SakayNa",
  },
  description:
    "Fast, safe, and verified motorcycle ride-hailing built for Iligan City commuters and driver partners.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} overflow-x-clip`}>
      <body className="min-h-screen w-full overflow-x-clip bg-[#FAFAFA] text-[#1E2329] antialiased">
        {children}
      </body>
    </html>
  );
}
