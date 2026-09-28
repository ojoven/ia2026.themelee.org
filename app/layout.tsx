import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { event } from "@/lib/event.mjs";
import "./globals.css";

const grotesk = localFont({
  src: "../node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2",
  variable: "--font-heading",
  display: "swap",
  weight: "300 700",
});
const inter = localFont({
  src: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-body",
  display: "swap",
  weight: "100 900",
});
const caveat = localFont({
  src: "../node_modules/@fontsource/caveat/files/caveat-latin-500-normal.woff2",
  variable: "--font-hand",
  display: "swap",
  weight: "500",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(event.siteUrl),
  title: `${event.title} · ${event.date}`,
  description: event.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: event.title,
    description: event.description,
    url: "/",
    siteName: event.name,
    locale: "es_ES",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Encuentro sobre IA, desarrollo y producto de The Mêlée, el 2 de octubre en Donostia.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: event.title,
    description: event.description,
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.png", type: "image/png", sizes: "64x64" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = { themeColor: "#f5f1e9" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${grotesk.variable} ${inter.variable} ${caveat.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
