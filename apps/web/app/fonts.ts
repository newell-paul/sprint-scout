import localFont from "next/font/local";
// The latin variable files Google Fonts serves, committed rather than fetched
// at compile time; see fonts/OFL.txt.
export const body = localFont({
  src: "./fonts/inter-latin-variable.woff2",
  weight: "400 800",
  variable: "--font-body",
  display: "swap",
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
});
export const mono = localFont({
  src: "./fonts/jetbrains-mono-latin-variable.woff2",
  weight: "400 700",
  variable: "--font-mono",
  display: "swap",
  fallback: ["ui-monospace", "Menlo", "monospace"],
});
