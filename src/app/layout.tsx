import type { Metadata, Viewport } from "next";
import { EB_Garamond, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const garamond = EB_Garamond({ variable: "--font-garamond", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "LN Studio", template: "%s · LN Studio" },
  description: "Area riservata corsi di portamento",
  applicationName: "LN Studio",
  // Aggiunta alla schermata Home su iOS: si apre a tutto schermo come un'app
  appleWebApp: { capable: true, title: "LN Studio", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // contenuti fino ai bordi; i margini sicuri sono gestiti con env(safe-area-inset-*)
  themeColor: "#542033",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Le variabili dei font stanno su <html> perché i token Tailwind (@theme) vengono risolti su :root
    <html lang="it" className={`${inter.variable} ${garamond.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
