import localFont from "next/font/local";
// The latin variable files Google Fonts serves, committed rather than fetched
// at compile time; see fonts/OFL.txt.
export const body = localFont({
  src: "./fonts/dm-sans-latin-variable.woff2",
  weight: "400 700",
  variable: "--font-body",
  display: "swap",
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
});
export const display = localFont({
  src: "./fonts/outfit-latin-variable.woff2",
  weight: "700 800",
  variable: "--font-display",
  display: "swap",
  fallback: ["Avenir Next", "sans-serif"],
});
