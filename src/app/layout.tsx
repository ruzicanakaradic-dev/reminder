import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppChrome } from "@/components/AppChrome";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});
const display = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ružini domaći kolači — Dnevnik porudžbina",
  description: "Porudžbine, kupci, kalendar i podsetnici za domaće kolače.",
  manifest: "/manifest.webmanifest",
  applicationName: "Ružini kolači",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ružini kolači",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#e84a7f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr">
      <body className={`${sans.variable} ${display.variable}`}>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
