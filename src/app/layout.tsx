import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist } from "next/font/google";
import "./globals.css";
import { AppChrome } from "@/components/AppChrome";
import { cn } from "@/lib/utils";

// Geist = telo/UI; Bricolage = Trust ime (brend font identiteta aplikacije).
const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-brand",
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trust — vođenje porudžbina",
  description: "Trust — aplikacija za vođenje porudžbina za poslastičare: porudžbine, kalendar, kupci, statistika i podsetnici.",
  manifest: "/manifest.webmanifest",
  applicationName: "Trust",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Trust",
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
    <html lang="sr" className={cn("font-sans", geist.variable, bricolage.variable)} suppressHydrationWarning>
      <head>
        {/* Postavi temu pre prvog iscrtavanja (bez treperenja). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('tema');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}",
          }}
        />
      </head>
      <body>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
