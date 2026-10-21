import { test as base, expect, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { installOpenMeteo, type OpenMeteo } from "@scout/testing/playwright";
import { writeFile } from "node:fs/promises";
import allowlist from "./a11y-allowlist.json" with { type: "json" };
import {
  DemoPlanner,
  northbound,
  Planner,
  routesKey,
  type Point,
} from "./pages";

export { expect };

export { northbound };
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
  planner: Planner;
  demo: DemoPlanner;
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
        await page.addInitScript((key) => {
          try {
            if (localStorage.getItem(key) === null)
              localStorage.setItem(key, "[]");
          } catch {
            /* Opaque origin. */
          }
        }, routesKey);
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
  planner: async ({ page }, use) => {
    await use(new Planner(page));
  },
  demo: async ({ page }, use) => {
    await use(new DemoPlanner(page));
  },
});
