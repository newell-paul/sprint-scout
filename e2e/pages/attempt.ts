import type { Locator, Page } from "@playwright/test";

/** Attempt conditions for the selected hour. */
export class Attempt {
  readonly conditions: Locator;

  constructor(page: Page) {
    this.conditions = page.getByRole("region", { name: "Attempt conditions" });
  }
}
