// Renders the README banner and the GitHub social preview from
// scripts/banner/banner.html and a live screenshot of the planner. Run it by
// hand with the dev server up; CI never runs it, because the screenshot shows
// a live forecast and live map tiles.
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const url = process.env.BANNER_URL ?? "http://127.0.0.1:3000/";
const template = pathToFileURL(resolve("scripts/banner/banner.html")).href;
const outputs = [
  {
    path: "docs/images/banner.jpg",
    w: 1000,
    h: 420,
    scale: 2,
    sizes: { logo: 46, head: 46, pill: 14, shot: 470 },
  },
  {
    path: "docs/images/social-preview.jpg",
    w: 1280,
    h: 640,
    scale: 1,
    sizes: { logo: 72, head: 50, pill: 18, shot: 600 },
  },
];

try {
  await fetch(url);
} catch {
  console.error(`Nothing answers on ${url}. Start it with: pnpm dev`);
  process.exit(1);
}

const browser = await chromium.launch();
try {
  const planner = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  await planner.goto(url);
  await planner
    .getByRole("button", { name: "Wind particles" })
    .waitFor({ timeout: 60_000 });
  // The particle field and tiles keep drawing after the toggle appears.
  await planner.waitForTimeout(4_000);
  const shot = (await planner.screenshot()).toString("base64");

  for (const { path, w, h, scale, sizes } of outputs) {
    const page = await browser.newPage({
      viewport: { width: w, height: h },
      deviceScaleFactor: scale,
    });
    await page.goto(template);
    const vars = Object.entries({ w, h, ...sizes })
      .map(([name, value]) => `--${name}:${value}px`)
      .join(";");
    await page.addStyleTag({
      content: `:root{${vars};--shot-image:url(data:image/png;base64,${shot})}`,
    });
    await page.evaluate("document.fonts.ready");
    await page.screenshot({ path, type: "jpeg", quality: 88 });
    console.log(`Wrote ${path} (${w * scale} × ${h * scale})`);
  }
} finally {
  await browser.close();
}
