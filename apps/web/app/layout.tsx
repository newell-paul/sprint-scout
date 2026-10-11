import type { ReactNode } from "react";
import { DM_Sans, Outfit } from "next/font/google";
import "./globals.css";
const body = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});
const display = Outfit({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
  display: "swap",
});
export const metadata = { title: "SprintScout" };
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
