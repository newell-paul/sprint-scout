import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DemoBanner } from "./index";

it("labels the demo banner as a landmark and states that Strava is disabled", () => {
  const html = renderToStaticMarkup(<DemoBanner />);
  expect(html).toContain('aria-label="Demo mode"');
  expect(html).toContain("Real Strava access is disabled.");
  expect(html.startsWith("<aside")).toBe(true);
});
