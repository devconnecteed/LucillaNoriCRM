import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "LN Stile e Portamento", template: "%s · LN Stile e Portamento" },
  description: "Area riservata corsi di portamento",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#822a44" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
