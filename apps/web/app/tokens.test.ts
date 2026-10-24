import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "globals.css"),
  "utf8",
);
const root = css.slice(
  css.indexOf(":root {"),
  css.indexOf("}", css.indexOf(":root {")),
);
const token = (name: string) => {
  const value = new RegExp(`--${name}: (#[0-9a-f]{6});`).exec(root)?.[1];
  if (!value) throw new Error(`--${name} is not a hex colour on :root`);
  return value;
};
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.039_28 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

// The page is dark only, so every text colour has to hold AA on every surface
// it can sit on, including the raised controls.
describe("colour tokens", () => {
  const surfaces = ["bg", "surface", "raised"];
  const text = [
    "ink",
    "muted",
    "accent",
    "wind",
    "data",
    "gain",
    "loss",
    "amber",
  ];

  it.each(text.flatMap((fg) => surfaces.map((bg) => [fg, bg])))(
    "--%s on --%s reaches 4.5:1",
    (fg, bg) => {
      expect(contrast(token(fg!), token(bg!))).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(surfaces)("the focus ring reaches 3:1 on --%s", (bg) => {
    expect(contrast(token("focus"), token(bg))).toBeGreaterThanOrEqual(3);
  });
});
