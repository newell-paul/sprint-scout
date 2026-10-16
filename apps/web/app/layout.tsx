import type { ReactNode } from "react";
import { body, display } from "./fonts";
import "./globals.css";
export const metadata = { title: "SprintScout" };
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
