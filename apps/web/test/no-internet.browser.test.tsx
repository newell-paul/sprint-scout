import { expect, it } from "vitest";
import { takeUnhandled } from "./unhandled";

// Every other component test relies on this guard to prove it never reaches
// the internet, so it is exercised directly: an external request must fail
// without leaving the browser and be recorded, while local assets pass.
it("fails and records a request to another origin", async () => {
  await expect(fetch("https://example.com/sprint-scout")).rejects.toThrow();
  expect(takeUnhandled()).toEqual(["https://example.com/sprint-scout"]);
});

it("lets same-origin requests through", async () => {
  const response = await fetch("/mockServiceWorker.js");
  expect(response.ok).toBe(true);
  expect(takeUnhandled()).toEqual([]);
});
