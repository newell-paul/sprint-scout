import { expect, type Locator, type Page } from "@playwright/test";

/** Imported GPX efforts and their past wind. */
export class EffortsPanel {
  readonly region: Locator;
  readonly heading: Locator;
  readonly status: Locator;
  readonly ownership: Locator;
  readonly importInput: Locator;
  readonly rows: Locator;
  readonly winds: Locator;
  readonly pastWindConsent: Locator;
  readonly loadPastWindButton: Locator;

  constructor(page: Page) {
    this.region = page.getByTestId("efforts-panel");
    this.heading = this.region.getByRole("heading");
    this.status = this.region.getByRole("status");
    this.ownership = this.region.getByRole("checkbox", {
      name: /my own device recording/,
    });
    this.importInput = this.region.getByLabel("Import GPX ride");
    this.rows = page.getByTestId("effort-row");
    this.winds = page.getByTestId("effort-wind");
    this.pastWindConsent = this.region.getByRole("checkbox", {
      name: /past wind/,
    });
    this.loadPastWindButton = this.region.getByRole("button", {
      name: "Load past wind",
      exact: true,
    });
  }

  time(row: number) {
    return this.rows.nth(row).getByTestId("effort-time");
  }

  async confirmOwnRecording() {
    await this.ownership.check();
  }

  /** Imports a fixture from e2e/data by name. */
  async importGpx(name: string) {
    await this.confirmOwnRecording();
    await expect(this.importInput).toBeEnabled();
    await this.importInput.setInputFiles(`e2e/data/${name}.gpx`);
  }

  async remove(row: number) {
    await this.rows
      .nth(row)
      .getByRole("button", { name: /Remove effort/ })
      .click();
  }

  async loadPastWind() {
    await this.pastWindConsent.check();
    await this.loadPastWindButton.click();
  }
}
