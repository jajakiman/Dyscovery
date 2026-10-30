import type { Metadata } from "next";
import { Andika, Nunito_Sans } from "next/font/google";
import "./globals.css";

const ui = Nunito_Sans({ subsets: ["latin"], variable: "--font-ui", display: "swap" });
const reading = Andika({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-reading", display: "swap" });

export const metadata: Metadata = {
  title: "Dyscovery",
  description: "Ruang guru untuk mendampingi sesi membaca, meninjau observasi, dan menemukan dukungan bagi anak.",
  icons: {
    icon: [{ url: "/brand/favicon.ico", sizes: "any" }, { url: "/brand/favicon.svg", type: "image/svg+xml" }],
    apple: "/brand/icon-192.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${ui.variable} ${reading.variable}`}>
      <body>{children}</body>
    </html>
  );
}
