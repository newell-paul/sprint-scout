import localFont from "next/font/local";
// Committed rather than fetched from Google at compile time; see fonts/OFL.txt.
export const body = localFont({
  src: [
    { path: "./fonts/dm-sans-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/dm-sans-latin-500-normal.woff2", weight: "500" },
    { path: "./fonts/dm-sans-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-body",
  display: "swap",
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
});
export const display = localFont({
  src: [
    { path: "./fonts/outfit-latin-700-normal.woff2", weight: "700" },
    { path: "./fonts/outfit-latin-800-normal.woff2", weight: "800" },
  ],
  variable: "--font-display",
  display: "swap",
  fallback: ["Avenir Next", "sans-serif"],
});
