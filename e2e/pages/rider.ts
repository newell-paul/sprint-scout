import type { Locator, Page } from "@playwright/test";

/** The rider's power, mass and CdA, behind the Rider disclosure. */
export class RiderPanel {
  readonly summary: Locator;
  readonly toggle: Locator;
  readonly power: Locator;

  constructor(page: Page) {
    this.summary = page.getByTestId("rider-summary");
    this.toggle = page.getByText("Rider", { exact: false }).first();
    this.power = page.getByLabel("Sustained power");
  }

  async open() {
    await this.toggle.click();
  }

  async setPower(watts: number) {
    await this.power.fill(String(watts));
  }
}
