import type { Locator, Page } from "@playwright/test";

/** The segment strip and the Manage menu of the selected segment. */
export class SegmentLibrary {
  readonly heading: Locator;
  readonly strip: Locator;
  readonly scrollLeftButton: Locator;
  readonly scrollRightButton: Locator;
  readonly undoDeleteButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.locator(".segment-heading strong");
    this.strip = page.getByRole("group", { name: "Segments", exact: true });
    this.scrollLeftButton = page.getByRole("button", {
      name: "Scroll segments left",
    });
    this.scrollRightButton = page.getByRole("button", {
      name: "Scroll segments right",
    });
    this.undoDeleteButton = page.getByRole("button", { name: "Undo delete" });
  }

  /** Slots are numbered from 1, as the rider sees them. */
  slot(number: number) {
    return this.page.getByTestId(`segment-slot-${number}`);
  }

  emptyMessage(number: number) {
    return this.page.getByText(`Segment ${number} is empty`);
  }

  slotButtons() {
    return this.strip.getByRole("button");
  }

  stripScrollLeft() {
    return this.strip.evaluate((element) => element.scrollLeft);
  }

  async selectSlot(number: number) {
    await this.slot(number).click();
  }

  async scrollRight() {
    await this.scrollRightButton.click();
  }

  async redraw() {
    await this.manage("Redraw segment");
  }

  async delete() {
    await this.manage("Delete segment");
  }

  async undoDelete() {
    await this.undoDeleteButton.click();
  }

  private async manage(action: string) {
    await this.page.getByText("Manage", { exact: true }).click();
    await this.page.getByRole("button", { name: action, exact: true }).click();
  }
}
