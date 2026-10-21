import type { Locator, Page } from "@playwright/test";

/** The rider's power, mass and CdA, behind the Rider disclosure. */
export class RiderPanel {
  readonly summary: Locator;
  readonly toggle: Locator;
  readonly power: Locator;
  readonly cda: Locator;
  readonly note: Locator;
  readonly referenceButton: Locator;

  constructor(page: Page) {
    this.summary = page.getByTestId("rider-summary");
    this.toggle = page.getByText("Rider", { exact: false }).first();
    this.power = page.getByLabel("Sustained power");
    this.cda = page.getByLabel("CdA");
    this.note = page.locator(".rider-note");
    this.referenceButton = page.getByRole("button", {
      name: "Use reference rider",
    });
  }

  async open() {
    await this.toggle.click();
  }

  async setPower(watts: number) {
    await this.power.fill(String(watts));
  }

  async setCda(cda: number) {
    await this.cda.fill(String(cda));
  }

  async useReference() {
    await this.referenceButton.click();
  }
}
