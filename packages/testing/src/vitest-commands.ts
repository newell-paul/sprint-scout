import type { BrowserCommand } from "vitest/node";
import type {} from "@vitest/browser-playwright";

// Vitest browser-mode command, run in the Node process: Playwright's accessibility-tree YAML for
// the element the test's locator points at, so component tests commit the
// same ARIA snapshots the e2e specs do.
export const ariaSnapshot: BrowserCommand<[{ selector: string } | string]> = (
  context,
  locator,
) => {
  if (context.provider.name !== "playwright")
    throw new Error("ariaSnapshot needs the playwright provider");
  const selector = typeof locator === "string" ? locator : locator.selector;
  return context.iframe.locator(selector).ariaSnapshot();
};
