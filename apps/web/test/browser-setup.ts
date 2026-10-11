import "../app/globals.css";
import { afterAll, afterEach, beforeAll, beforeEach, expect, vi } from "vitest";
import { cleanup } from "vitest-browser-react/pure";
import axe from "axe-core";
import { openMeteoWorker } from "@scout/testing/msw-browser";
import { fixedTime, openMeteo } from "./fixtures";

// Real Chromium, real CSS, recorded Open-Meteo through msw, frozen clock,
// and axe on the final state of every passing test. Mirrors e2e/fixtures.ts.
export const worker = openMeteoWorker(openMeteo);

beforeAll(() =>
  worker.start({
    onUnhandledRequest: "bypass",
    quiet: true,
    serviceWorker: { url: "/mockServiceWorker.js" },
  }),
);
afterAll(() => worker.stop());

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(fixedTime));
});

afterEach(async (context) => {
  try {
    if (context.task.result?.state === "pass") await checkAccessibility();
  } finally {
    await cleanup();
    vi.useRealTimers();
  }
});

async function checkAccessibility() {
  const results = await axe.run(document.body, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
  });
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
  ).toEqual([]);
}
