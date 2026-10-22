import type { Metadata, Viewport } from "next";
import { EB_Garamond, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const garamond = EB_Garamond({ variable: "--font-garamond", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "LN Studio", template: "%s · LN Studio" },
  description: "Area riservata corsi di portamento",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#542033" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Le variabili dei font stanno su <html> perché i token Tailwind (@theme) vengono risolti su :root
    <html lang="it" className={`${inter.variable} ${garamond.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
