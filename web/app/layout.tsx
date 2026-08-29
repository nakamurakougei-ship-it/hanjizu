import type { Metadata, Viewport } from "next";
import { Yuji_Syuku } from "next/font/google";
import "./globals.css";

const yujiSyuku = Yuji_Syuku({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-brush",
});

export const metadata: Metadata = {
  title: "判じ図 | 造作の見積補助",
  description:
    "仕上がり寸法から箱を組み、部材を材料ごとに振り分け、木取図と枚数・値段を出す見積補助アプリです。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={yujiSyuku.variable}>
      <body>{children}</body>
    </html>
  );
}
