import "../app/globals.css";
import { afterAll, afterEach, beforeAll, beforeEach, expect, vi } from "vitest";
import { cleanup } from "vitest-browser-react/pure";
import axe from "axe-core";
import { blockExternal, openMeteoWorker } from "@scout/testing/msw-browser";
import { fixedTime, openMeteo } from "./fixtures";
import { recordUnhandled, takeUnhandled } from "./unhandled";

// Real Chromium, real CSS, recorded Open-Meteo through msw, frozen clock,
// and axe on the final state of every passing test. Mirrors e2e/fixtures.ts.
const worker = openMeteoWorker(openMeteo);

beforeAll(() =>
  worker.start({
    onUnhandledFrame: blockExternal(location.origin, recordUnhandled),
    quiet: true,
    serviceWorker: { url: "/mockServiceWorker.js" },
  }),
);
// Not awaited: msw 3 waits for requests in flight, and the timeout fixtures
// never answer (`delay("infinite")`).
afterAll(() => {
  void worker.stop();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(fixedTime));
});

afterEach(async (context) => {
  try {
    if (context.task.result?.state === "pass") await checkAccessibility();
    expect(takeUnhandled(), "requests that would reach the internet").toEqual(
      [],
    );
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
