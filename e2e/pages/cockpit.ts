import type { Locator, Page } from "@playwright/test";

/** The ride readouts: estimated time, speed dial, wind summary and compass. */
export class Cockpit {
  readonly region: Locator;
  readonly speed: Locator;
  readonly segmentTime: Locator;
  readonly calmTime: Locator;
  readonly timeDifference: Locator;
  readonly windSummary: Locator;
  readonly weatherIcon: Locator;
  readonly dial: Locator;
  readonly dialRange: Locator;
  readonly dialNeedle: Locator;
  readonly compass: Locator;

  constructor(page: Page) {
    this.region = page.getByTestId("ride-cockpit");
    this.speed = page.getByTestId("cockpit-speed");
    this.segmentTime = page.getByTestId("segment-time-value");
    this.calmTime = page.getByTestId("segment-calm-time");
    this.timeDifference = page.getByTestId("segment-time-difference");
    this.windSummary = page.getByTestId("wind-summary");
    this.weatherIcon = page.getByTestId("weather-icon");
    this.dial = page.locator(".speed-dial");
    this.dialRange = page.locator(".dial-range");
    this.dialNeedle = page.locator(".dial-needle");
    this.compass = page.locator(".wind-compass");
  }

  time() {
    return this.segmentTime.innerText();
  }
}
