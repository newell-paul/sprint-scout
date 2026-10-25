import type { Locator, Page } from "@playwright/test";

/** The Data & privacy note in the footer and its Clear saved data control. */
export class DataPrivacy {
  readonly toggle: Locator;
  readonly clearButton: Locator;
  readonly confirmButton: Locator;
  readonly keepButton: Locator;

  constructor(page: Page) {
    this.toggle = page.getByText("Data & privacy", { exact: true });
    this.clearButton = page.getByRole("button", { name: "Clear saved data" });
    this.confirmButton = page.getByRole("button", { name: "Delete everything" });
    this.keepButton = page.getByRole("button", { name: "Keep my data" });
  }

  async clearSavedData() {
    await this.toggle.click();
    await this.clearButton.click();
    await this.confirmButton.click();
  }
}
