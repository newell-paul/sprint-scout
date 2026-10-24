import type { NextConfig } from "next";
// STATIC_EXPORT=1 builds the browser-only segment planner for static hosting
// (GitHub Pages). Server-backed entries use the `.server.ts(x)` suffix so the
// static build simply does not see them; the dev server and `next build`
// without the flag keep serving them. See docs/design.md "Static publication".
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
// DEV_ORIGINS="192.168.4.23,phone.local" lets a phone on the LAN load the dev
// server's scripts; Next 16 blocks cross-origin dev resources by default.
// Setting the list replaces Next's defaults, so keep loopback working too.
const extraOrigins = process.env.DEV_ORIGINS?.split(",").filter(Boolean);
const devOrigins = extraOrigins?.length
  ? ["localhost", "127.0.0.1", ...extraOrigins]
  : undefined;
const config: NextConfig = {
  ...(devOrigins?.length ? { allowedDevOrigins: devOrigins } : {}),
  transpilePackages: [
    "@scout/analysis",
    "@scout/ui",
    "@scout/application",
    "@scout/contracts",
  ],
  pageExtensions: isStatic
    ? ["tsx", "ts"]
    : ["tsx", "ts", "server.tsx", "server.ts"],
  ...(isStatic
    ? {
        output: "export",
        trailingSlash: true,
        ...(basePath ? { basePath, assetPrefix: basePath } : {}),
      }
    : {}),
};
export default config;
