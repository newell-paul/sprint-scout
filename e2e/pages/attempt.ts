import type { Locator, Page } from "@playwright/test";

/** Attempt conditions and the segment target. */
export class Attempt {
  readonly conditions: Locator;
  readonly targetField: Locator;
  readonly saveTargetButton: Locator;
  readonly removeTargetButton: Locator;
  readonly comparison: Locator;

  constructor(page: Page) {
    this.conditions = page.getByRole("region", { name: "Attempt conditions" });
    this.targetField = page.getByLabel("Target time (minutes:seconds)");
    this.saveTargetButton = page.getByRole("button", {
      name: "Save target",
      exact: true,
    });
    this.removeTargetButton = page.getByRole("button", {
      name: "Remove target",
      exact: true,
    });
    this.comparison = page.getByTestId("target-comparison");
  }

  async setTarget(time: string) {
    await this.targetField.fill(time);
    await this.saveTargetButton.click();
  }

  async removeTarget() {
    await this.removeTargetButton.click();
  }
}
