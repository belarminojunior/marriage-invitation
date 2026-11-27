import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Inter, Montserrat } from "next/font/google";
import { coupleNamesOf } from "@wedding/core/event";
import { getStore } from "@wedding/core/data/store";
import "@wedding/core/styles/base.css";

const sans = Montserrat({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-sans" });
const serif = Bodoni_Moda({ subsets: ["latin"], variable: "--font-serif" });
const table = Inter({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-table" });

export async function generateMetadata(): Promise<Metadata> {
  const couple = coupleNamesOf(await getStore().getEvent());
  return {
    title: { default: `Painel dos noivos · ${couple}`, template: `%s · ${couple}` },
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#1E1C1A",
};

export default function AdminRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt" className={`${sans.variable} ${serif.variable} ${table.variable}`}>
      <body>{children}</body>
    </html>
  );
}
