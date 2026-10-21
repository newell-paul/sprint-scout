import type { Locator, Page } from "@playwright/test";

/** The opportunity board that ranks every saved segment. */
export class Board {
  readonly region: Locator;
  readonly rankButton: Locator;
  readonly refreshButton: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    this.region = page.getByTestId("opportunity-board");
    this.rankButton = page.getByRole("button", { name: "Rank my segments" });
    this.refreshButton = page.getByRole("button", { name: "Refresh" });
    this.rows = page.getByTestId("board-row");
  }

  row(segment: string) {
    return this.rows.filter({ hasText: segment });
  }

  gain(row: Locator) {
    return row.locator(".board-gain");
  }

  openButton(row: Locator) {
    return row.getByRole("button", { name: "Open" });
  }

  async rank() {
    await this.rankButton.click();
  }

  async refresh() {
    await this.refreshButton.click();
  }

  async open(segment: string) {
    await this.openButton(this.row(segment)).click();
  }
}
