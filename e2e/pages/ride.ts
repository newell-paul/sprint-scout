import { expect, type Locator, type Page } from "@playwright/test";

/** The editor's "From a ride" section: own-recording tick, file and the two picks. */
export class RideSource {
  readonly region: Locator;
  readonly toggle: Locator;
  readonly ownership: Locator;
  readonly openInput: Locator;
  readonly start: Locator;
  readonly finish: Locator;
  readonly closeButton: Locator;
  readonly status: Locator;

  constructor(page: Page) {
    this.region = page.getByTestId("ride-source");
    this.toggle = this.region.getByText("From a ride", { exact: true });
    this.ownership = this.region.getByRole("checkbox", { name: /my own device recording/ });
    this.openInput = this.region.getByLabel("Open GPX ride");
    this.start = this.region.getByRole("slider", { name: "Segment start" });
    this.finish = this.region.getByRole("slider", { name: "Segment finish" });
    this.closeButton = this.region.getByRole("button", { name: "Close ride" });
    this.status = this.region.getByRole("status");
  }

  /** Opens a fixture from e2e/data by name. */
  async open(name: string) {
    await this.toggle.click();
    await this.ownership.check();
    await expect(this.openInput).toBeEnabled();
    await this.openInput.setInputFiles(`e2e/data/${name}.gpx`);
    await expect(this.start).toBeVisible();
  }
}
