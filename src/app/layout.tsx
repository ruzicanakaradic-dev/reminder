import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { AppChrome } from "@/components/AppChrome";

const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  variable: "--font-archivo",
  weight: ["400", "600", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ružini domaći kolači — Knjiga porudžbina",
  description: "Evidencija porudžbina, kalendar, kupci, statistika i podsetnici.",
  manifest: "/manifest.webmanifest",
  applicationName: "Ružini kolači",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ružini kolači",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#7a3785",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr">
      <body className={archivo.variable}>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
