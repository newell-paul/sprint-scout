import type { Locator, Page } from "@playwright/test";

/** The forecast hour: slider, day and best-hour buttons, bands and hourly table. */
export class Timeline {
  readonly slider: Locator;
  readonly previousButton: Locator;
  readonly nextButton: Locator;
  readonly todayButton: Locator;
  readonly tomorrowButton: Locator;
  readonly bestHourButton: Locator;
  readonly dryDaylight: Locator;
  readonly selectedWindow: Locator;
  readonly dayTicks: Locator;
  readonly nightBands: Locator;
  readonly wetBands: Locator;
  readonly chart: Locator;
  readonly placeholder: Locator;
  readonly tryAgainButton: Locator;
  readonly hourlyToggle: Locator;
  readonly hourlyTable: Locator;
  readonly hourlyRows: Locator;
  readonly hourlyButtons: Locator;

  constructor(private readonly page: Page) {
    this.slider = page.getByRole("slider", { name: "Forecast hour" });
    this.previousButton = page.getByRole("button", { name: "Previous hour" });
    this.nextButton = page.getByRole("button", { name: "Next hour" });
    this.todayButton = page.getByRole("button", { name: "Today", exact: true });
    this.tomorrowButton = page.getByRole("button", {
      name: "Tomorrow",
      exact: true,
    });
    this.bestHourButton = page.getByRole("button", {
      name: "Best hour",
      exact: true,
    });
    this.dryDaylight = page.getByLabel("Dry daylight only");
    this.selectedWindow = page.getByTestId("selected-window");
    this.dayTicks = page.getByTestId("wind-day-tick");
    this.nightBands = page.getByTestId("band-night");
    this.wetBands = page.getByTestId("band-wet");
    this.chart = page.getByTestId("time-chart");
    this.placeholder = page.getByTestId("forecast-placeholder");
    this.tryAgainButton = page.getByRole("button", {
      name: "Try again",
      exact: true,
    });
    this.hourlyToggle = page.getByText("Hourly times", { exact: true });
    this.hourlyTable = page.getByRole("region", { name: "Hourly times table" });
    this.hourlyRows = page.locator(".hourly-time-table tbody tr");
    this.hourlyButtons = page.locator(".hourly-time-table tbody button");
  }

  async hour() {
    return Number(await this.slider.inputValue());
  }

  hourlyScrollTop() {
    return this.hourlyTable.evaluate((element) => element.scrollTop);
  }

  hourlyVerdict(row: number) {
    return this.hourlyRows.nth(row).locator("td").last();
  }

  async goToHour(hour: number) {
    await this.slider.fill(String(hour));
  }

  async next() {
    await this.nextButton.click();
  }

  async previous() {
    await this.previousButton.click();
  }

  async tomorrow() {
    await this.tomorrowButton.click();
  }

  async bestHour() {
    await this.bestHourButton.click();
  }

  async onlyDryDaylight() {
    await this.dryDaylight.check();
  }

  async showHourlyTimes() {
    await this.hourlyToggle.click();
  }

  async pickHourlyRow(row: number) {
    await this.hourlyButtons.nth(row).click();
  }

  /** Clicks the slider track at a fraction of its width. */
  async clickTrack(fraction: number) {
    const bounds = (await this.slider.boundingBox())!;
    await this.slider.click({
      position: { x: bounds.width * fraction, y: bounds.height / 2 },
    });
  }

  async centre() {
    await this.slider.evaluate((element) => element.scrollIntoView({ block: "center" }));
  }

  async tryAgain() {
    await this.tryAgainButton.click();
  }

  /** Focuses the slider and presses one key, as a keyboard rider would. */
  async press(key: string) {
    await this.slider.focus();
    await this.page.keyboard.press(key);
  }
}
