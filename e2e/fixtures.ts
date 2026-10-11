import {
  test as base,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { installOpenMeteo, type OpenMeteo } from "@scout/testing/playwright";
import { writeFile } from "node:fs/promises";
import allowlist from "./a11y-allowlist.json" with { type: "json" };

export { expect };

export type Point = [number, number];
export type SeedRoute = {
  id: string;
  name: string;
  slot: number;
  points: Point[];
  confirmed: true;
  createdAt: string;
  targetTimeS?: number | null;
  terrainMode?: "flat" | "terrain";
  terrainAuto?: boolean;
  shelter?: "exposed" | "sheltered" | "dense";
  efforts?: Record<string, unknown>[];
};
export type Rider = { powerW: number; massKg: number; cdaM2: number };

export const northbound: Point[] = [
  [-0.12, 51.5],
  [-0.12, 51.51],
];

export const aRoute = (overrides: Partial<SeedRoute> = {}): SeedRoute => ({
  id: "hill",
  name: "Test hill",
  slot: 0,
  points: northbound,
  confirmed: true,
  createdAt: "2026-09-10T00:00:00Z",
  ...overrides,
});

export type { OpenMeteo } from "@scout/testing/playwright";

type Allow = { rule: string; owner: string; expires: string; reason: string };
const activeAllowlist = (allowlist as Allow[]).filter(
  (entry) => Date.parse(entry.expires) > Date.now(),
);

type Fixtures = {
  /** ISO instant the page clock is frozen at before navigation. */
  fixedTime: string;
  /** Install a controllable clock (for `page.clock.runFor`) instead of a frozen one. */
  installClock: boolean;
  /** Every request that left the app origin, in order. */
  externalRequests: string[];
  /** Run axe against the final page state after the test body. */
  a11yCheck: boolean;
  /** Leave storage untouched so the app seeds its example segment. */
  firstVisit: boolean;
  library: void;
  clock: void;
  openMeteo: OpenMeteo;
  /** Write storage from /health, then open the planner. */
  seed: (data: { routes?: SeedRoute[]; rider?: Rider }) => Promise<void>;
  a11y: void;
  aria: (name: string, locator: Locator) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  fixedTime: ["2026-09-11T07:00:00Z", { option: true }],
  installClock: [false, { option: true }],
  a11yCheck: [true, { option: true }],
  firstVisit: [false, { option: true }],
  timezoneId: "Europe/London",
  // Tests start from an emptied library, not a first visit, unless they opt in.
  library: [
    async ({ page, firstVisit }, use) => {
      if (!firstVisit)
        await page.addInitScript(() => {
          try {
            if (localStorage.getItem("sprint-scout.drawn-routes.v1") === null)
              localStorage.setItem("sprint-scout.drawn-routes.v1", "[]");
          } catch {
            /* Opaque origin. */
          }
        });
      await use();
    },
    { auto: true },
  ],
  clock: [
    async ({ page, fixedTime, installClock }, use) => {
      if (installClock) await page.clock.install({ time: new Date(fixedTime) });
      else await page.clock.setFixedTime(new Date(fixedTime));
      await use();
    },
    { auto: true },
  ],
  externalRequests: async ({ page, baseURL }, use) => {
    const seen: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (!/^https?:/.test(url) || url.startsWith(baseURL!)) return;
      seen.push(url);
    });
    await use(seen);
  },
  openMeteo: [
    async ({ page }, use) => {
      const meteo = await installOpenMeteo(page);
      await use(meteo);
      expect(meteo.unhandled, "requests that would reach the internet").toEqual(
        [],
      );
    },
    { auto: true },
  ],
  seed: async ({ page }, use) => {
    await use(async ({ routes, rider }) => {
      await page.goto("/health");
      await page.evaluate(
        ([routesJson, riderJson]) => {
          if (routesJson)
            localStorage.setItem("sprint-scout.drawn-routes.v1", routesJson);
          if (riderJson)
            localStorage.setItem("sprint-scout.rider.v1", riderJson);
        },
        [
          routes ? JSON.stringify(routes) : null,
          rider ? JSON.stringify(rider) : null,
        ],
      );
      await page.goto("/");
    });
  },
  a11y: [
    async ({ page, a11yCheck }, use, testInfo) => {
      await use();
      if (
        !a11yCheck ||
        testInfo.status !== testInfo.expectedStatus ||
        page.isClosed()
      )
        return;
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .disableRules(activeAllowlist.map((entry) => entry.rule))
        .analyze();
      const report = JSON.stringify(results.violations, null, 2);
      await testInfo.attach("axe", {
        body: report,
        contentType: "application/json",
      });
      await writeFile(testInfo.outputPath("axe.json"), report);
      const blocking = results.violations.filter(
        (violation) =>
          violation.impact === "serious" || violation.impact === "critical",
      );
      expect(
        blocking.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.map((node) => node.target.join(" ")),
        })),
        "serious or critical accessibility violations in the final page state",
      ).toEqual([]);
    },
    { auto: true },
  ],
  aria: async ({}, use) => {
    await use(async (name, locator) => {
      await expect(locator).toMatchAriaSnapshot({ name: `${name}.aria.yml` });
    });
  },
});

export async function drawSegment(
  page: Page,
  name: string,
  points: Point[] = northbound,
) {
  await page.getByText("Enter coordinates instead", { exact: true }).click();
  for (const [longitude, latitude] of points) {
    await page.getByLabel("Latitude", { exact: true }).fill(String(latitude));
    await page.getByLabel("Longitude", { exact: true }).fill(String(longitude));
    await page
      .getByRole("button", { name: "Add point and centre map" })
      .click();
  }
  await page.getByLabel("Route name", { exact: true }).fill(name);
  await page.getByRole("checkbox", { name: /created this route/ }).check();
  await page.getByRole("button", { name: "Save route", exact: true }).click();
  await expect(page.locator("p[role=status]")).toHaveText(
    "Route saved on this browser.",
  );
}
export const segmentHeading = (page: Page) =>
  page.locator(".segment-heading strong");
export const slider = (page: Page) =>
  page.getByRole("slider", { name: "Forecast hour" });
export const manage = async (page: Page, action: string) => {
  await page.getByText("Manage", { exact: true }).click();
  await page.getByRole("button", { name: action, exact: true }).click();
};
export const terrainPanel = (page: Page) =>
  page.getByRole("region", { name: "Segment terrain", exact: true });
export const segmentTime = (page: Page) =>
  page.getByTestId("segment-time-value");

/** Redraw the current segment reversed and save it, the standard geometry edit. */
export async function reverseAndSave(page: Page) {
  await page.getByText("Manage", { exact: true }).click();
  await page
    .getByRole("button", { name: "Redraw segment", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reverse direction", exact: true })
    .click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Save route", exact: true }).click();
}

export async function loadTerrain(page: Page) {
  const panel = terrainPanel(page);
  await panel.getByRole("checkbox", { name: /Share sampled/ }).check();
  await panel
    .getByRole("button", { name: "Load terrain", exact: true })
    .click();
  await expect(panel.getByRole("heading")).toHaveText("Terrain · Enabled");
}

// Counts pixels of a colour in a canvas screenshot: the one check that proves
// MapLibre actually painted a layer rather than mounting an empty map.
export async function paintedPixels(
  page: Page,
  canvas: Locator,
  colours: string | string[],
  tolerance = 16,
) {
  const png = (await canvas.screenshot()).toString("base64");
  const wanted = [colours]
    .flat()
    .map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
  return page.evaluate(
    async ([data, wanted, tol]) => {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      const scratch = document.createElement("canvas");
      scratch.width = image.width;
      scratch.height = image.height;
      const context = scratch.getContext("2d")!;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(
        0,
        0,
        scratch.width,
        scratch.height,
      ).data;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4)
        if (
          wanted.some(
            ([red, green, blue]) =>
              Math.abs(pixels[i]! - red!) <= tol &&
              Math.abs(pixels[i + 1]! - green!) <= tol &&
              Math.abs(pixels[i + 2]! - blue!) <= tol,
          )
        )
          count++;
      return count;
    },
    [png, wanted, tolerance] as const,
  );
}
