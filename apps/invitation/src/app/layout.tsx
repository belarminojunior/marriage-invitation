import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Cormorant_Garamond, Montserrat, Pinyon_Script } from "next/font/google";
import { coupleNames } from "@wedding/core/wedding";
import "@wedding/core/styles/base.css";

const script = Pinyon_Script({ weight: "400", subsets: ["latin"], variable: "--font-script" });
const sans = Montserrat({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-sans" });
const serif = Bodoni_Moda({ style: ["normal", "italic"], subsets: ["latin"], variable: "--font-serif" });
const verse = Cormorant_Garamond({
  weight: ["400", "500"],
  style: ["italic"],
  subsets: ["latin"],
  variable: "--font-verse",
});

export const metadata: Metadata = {
  title: `${coupleNames} · Convite de casamento`,
  description: `Convite digital para o casamento de ${coupleNames}.`,
};

export const viewport: Viewport = {
  themeColor: "#1B1A18",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt" className={`${script.variable} ${sans.variable} ${serif.variable} ${verse.variable}`}>
      <body>{children}</body>
    </html>
  );
}
