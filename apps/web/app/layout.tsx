import type { ReactNode } from "react";
import { contentSecurityPolicy } from "./csp";
import { body, mono } from "./fonts";
import "./globals.css";
export const metadata = { title: "SprintScout" };
// The dev server needs eval and a websocket for Fast Refresh, so only the
// published export carries the policy.
const isStatic = process.env.STATIC_EXPORT === "1";
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${mono.variable}`}>
      {isStatic && (
        <head>
          <meta
            httpEquiv="Content-Security-Policy"
            content={contentSecurityPolicy}
          />
        </head>
      )}
      <body>{children}</body>
    </html>
  );
}
