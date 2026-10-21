import { expect, type Locator, type Page } from "@playwright/test";

/** The terrain panel: elevation consent, loading, modes and samples. */
export class TerrainPanel {
  readonly region: Locator;
  readonly heading: Locator;
  readonly consent: Locator;
  readonly automatic: Locator;
  readonly loadButton: Locator;
  readonly removeButton: Locator;
  readonly flatRoadButton: Locator;
  readonly terrainButton: Locator;
  readonly samplesToggle: Locator;
  readonly samples: Locator;
  readonly profile: Locator;

  constructor(page: Page) {
    this.region = page.getByRole("region", {
      name: "Segment terrain",
      exact: true,
    });
    this.heading = this.region.getByRole("heading");
    this.consent = this.region.getByRole("checkbox", { name: /Share sampled/ });
    this.automatic = this.region.getByRole("checkbox", {
      name: /Reload terrain automatically/,
    });
    this.loadButton = this.region.getByRole("button", {
      name: "Load terrain",
      exact: true,
    });
    this.removeButton = this.region.getByRole("button", {
      name: "Remove elevation",
      exact: true,
    });
    this.flatRoadButton = this.region.getByRole("button", {
      name: "Flat road",
      exact: true,
    });
    this.terrainButton = this.region.getByRole("button", {
      name: "Terrain",
      exact: true,
    });
    this.samplesToggle = this.region.getByText("Elevation samples & source", {
      exact: true,
    });
    this.samples = this.region.locator("tbody tr");
    this.profile = this.region.getByRole("img");
  }

  async giveConsent() {
    await this.consent.check();
  }

  async reloadAutomatically() {
    await this.automatic.check();
  }

  /** Consents and asks for elevation without waiting for the answer. */
  async requestTerrain() {
    await this.giveConsent();
    await this.loadButton.click();
  }

  /** Consents, loads and waits until terrain is enabled. */
  async load() {
    await this.requestTerrain();
    await expect(this.heading).toHaveText("Terrain · Enabled");
  }

  async remove() {
    await this.removeButton.click();
  }

  async useFlatRoad() {
    await this.flatRoadButton.click();
  }

  async useTerrain() {
    await this.terrainButton.click();
  }

  async showSamples() {
    await this.samplesToggle.click();
  }
}
