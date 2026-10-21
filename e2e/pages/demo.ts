import { expect, type Locator, type Page } from "@playwright/test";
import { horizontalOverflow, paintedPixels } from "./canvas";

/** The synthetic demo planner at `/demo`. */
export class DemoPlanner {
  readonly root: Locator;
  readonly heading: Locator;
  readonly banner: Locator;
  readonly map: Locator;
  readonly chart: Locator;
  readonly table: Locator;
  readonly hourRows: Locator;
  readonly currentRow: Locator;
  readonly attemptHour: Locator;
  readonly departure: Locator;
  readonly rideEffects: Locator;
  readonly approach: Locator;
  readonly from: Locator;
  readonly rideDate: Locator;
  readonly compareButton: Locator;
  readonly conditionsToggle: Locator;
  readonly scenario: Locator;
  readonly alert: Locator;
  readonly retryButton: Locator;
  readonly retryForecastButton: Locator;
  readonly darkThemeButton: Locator;
  readonly lightThemeButton: Locator;
  readonly mapUnavailable: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator(".planner");
    this.heading = page.getByRole("heading", { name: "Find your tailwind." });
    this.banner = page.getByRole("complementary", { name: "Demo mode" });
    this.map = page.getByTestId("route-map");
    this.chart = page.getByTestId("hour-chart");
    this.table = page.getByRole("table", { name: /Hourly comparison/ });
    this.hourRows = page.getByTestId("hour-row");
    this.currentRow = page.locator('tr[aria-current="true"]');
    this.attemptHour = page.getByRole("slider", { name: "Attempt hour" });
    this.departure = page.getByTestId("departure");
    this.rideEffects = page.getByTestId("ride-effect");
    this.approach = page.getByLabel("Approach (minutes)");
    this.from = page.getByLabel("From", { exact: true });
    this.rideDate = page.getByLabel("Ride date");
    this.compareButton = page.getByRole("button", {
      name: "Compare windows →",
    });
    this.conditionsToggle = page.getByText("Demo conditions & clock changes", {
      exact: true,
    });
    this.scenario = page.getByLabel("Weather scenario");
    this.alert = page.locator("main [role=alert]");
    this.retryButton = page.getByRole("button", { name: "Retry", exact: true });
    this.retryForecastButton = page.getByRole("button", {
      name: "Retry forecast",
      exact: true,
    });
    this.darkThemeButton = page.getByRole("button", { name: "Dark theme" });
    this.lightThemeButton = page.getByRole("button", { name: "Light theme" });
    this.mapUnavailable = page.getByText("Map unavailable", { exact: true });
  }

  card(segment: string) {
    return this.page.getByTestId(`card-${segment}`);
  }

  routeChoice(name: string) {
    return this.page.getByLabel(name, { exact: true });
  }

  messageHeading(name: string) {
    return this.page.getByRole("heading", { name });
  }

  status(text: string) {
    return this.page.getByRole("status").filter({ hasText: text });
  }

  /** The demo is server-rendered; input made before hydration is dropped. */
  async open() {
    await this.page.goto("/demo");
    await expect(this.root).toHaveAttribute("data-hydrated", "true");
  }

  async pressAttemptHour(key: string) {
    await this.attemptHour.focus();
    await this.page.keyboard.press(key);
  }

  async setApproach(minutes: number) {
    await this.approach.fill(String(minutes));
  }

  async setFrom(time: string) {
    await this.from.fill(time);
  }

  async setRideDate(date: string) {
    await this.rideDate.fill(date);
  }

  async selectSegment(name: string | RegExp, segment: string) {
    await this.card(segment).getByRole("button", { name }).click();
  }

  async deselectRoute(name: string) {
    await this.routeChoice(name).uncheck();
  }

  async chooseScenario(scenario: string) {
    await this.conditionsToggle.click();
    await this.scenario.selectOption(scenario);
  }

  /** Applies the form and waits for the comparison to settle. */
  async compare() {
    await this.compareButton.click();
    await expect(this.compareButton).toBeEnabled();
  }

  async pickLastHour() {
    const last = this.hourRows.last();
    const at = await last.getAttribute("data-attempt");
    await last.getByRole("button").click();
    return at!;
  }

  async retry() {
    await this.retryButton.click();
  }

  async useDarkTheme() {
    await this.darkThemeButton.click();
  }

  /** Pixels the page is wider than the viewport; 0 means no sideways scroll. */
  horizontalOverflow() {
    return horizontalOverflow(this.page);
  }

  painted(colours: string[]) {
    return paintedPixels(this.page, this.map.locator("canvas"), colours);
  }
}
