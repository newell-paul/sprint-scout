import { expect, type Locator, type Page } from "@playwright/test";
import { paintedPixels } from "./canvas";

/** The drawing map with its wind overlay and particle field. */
export class PlannerMap {
  readonly region: Locator;
  readonly canvas: Locator;
  readonly overlay: Locator;
  readonly particles: Locator;

  constructor(private readonly page: Page) {
    this.region = page.getByRole("region", { name: "Route drawing map" });
    this.canvas = this.region.locator("canvas.maplibregl-canvas");
    this.overlay = page.getByTestId("wind-map-overlay");
    this.particles = page.getByTestId("wind-particle-field");
  }

  /** The map installs its click-to-activate handling once MapLibre loads. */
  async waitUntilInteractive() {
    await expect(this.region).toHaveAttribute("data-map-active", /true|false/);
  }

  /** Clicks at an offset from the map's top-left corner. */
  async clickAt(x: number, y: number) {
    await this.region.click({ position: { x, y } });
  }

  async moveMouseAway() {
    await this.page.getByRole("heading", { name: "SprintScout" }).hover();
  }

  painted(colour: string) {
    return paintedPixels(this.page, this.canvas, colour);
  }
}
