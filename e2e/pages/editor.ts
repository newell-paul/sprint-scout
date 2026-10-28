import { expect, type Locator, type Page } from "@playwright/test";

export type Point = [number, number];

export const northbound: Point[] = [
  [-0.12, 51.5],
  [-0.12, 51.51],
];

/** The drawing bar and panel: coordinates, name, ownership confirmation, save. */
export class SegmentEditor {
  readonly region: Locator;
  readonly bar: Locator;
  readonly guidance: Locator;
  readonly coordinatesToggle: Locator;
  readonly latitude: Locator;
  readonly longitude: Locator;
  readonly addPointButton: Locator;
  readonly segmentName: Locator;
  readonly ownership: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly restoreButton: Locator;
  readonly reverseButton: Locator;
  readonly undoPointButton: Locator;
  readonly pointsToggle: Locator;
  readonly points: Locator;

  constructor(private readonly page: Page) {
    this.region = page.locator(".segment-editor");
    this.bar = page.locator(".drawing-bar");
    this.guidance = this.bar.locator("[aria-live]");
    this.coordinatesToggle = page.getByText("Enter coordinates instead", {
      exact: true,
    });
    this.latitude = page.getByLabel("Latitude", { exact: true });
    this.longitude = page.getByLabel("Longitude", { exact: true });
    this.addPointButton = page.getByRole("button", {
      name: "Add point and centre map",
    });
    this.segmentName = page.getByLabel("Segment name", { exact: true });
    this.ownership = page.getByRole("checkbox", { name: /created this route/ });
    this.saveButton = page.getByRole("button", {
      name: "Save segment",
      exact: true,
    });
    this.cancelButton = page.getByRole("button", { name: "Cancel drawing" });
    this.restoreButton = page.getByRole("button", { name: "Restore drawing" });
    this.reverseButton = page.getByRole("button", {
      name: "Reverse direction",
      exact: true,
    });
    this.undoPointButton = page.getByRole("button", { name: "Undo point" });
    this.pointsToggle = page.getByText("Ordered route points", { exact: true });
    this.points = this.region.locator("ol li");
  }

  pointCount(count: number) {
    return this.page.getByText(`${count} / 500 points`);
  }

  async useCoordinates() {
    await this.coordinatesToggle.click();
  }

  async addPoint([longitude, latitude]: Point) {
    await this.latitude.fill(String(latitude));
    await this.longitude.fill(String(longitude));
    await this.addPointButton.click();
  }

  /** Types a point and adds it with Enter: Tab carries focus between fields. */
  async addPointWithKeyboard([longitude, latitude]: Point) {
    await this.latitude.focus();
    await this.latitude.fill(String(latitude));
    await this.latitude.press("Tab");
    await this.longitude.fill(String(longitude));
    await this.addPointButton.press("Enter");
  }

  async name(name: string) {
    await this.segmentName.fill(name);
  }

  async confirmOwnership() {
    await this.ownership.check();
  }

  /** Switches to coordinate entry and adds each point in order. */
  async plot(points: Point[] = northbound) {
    await this.useCoordinates();
    for (const point of points) await this.addPoint(point);
  }

  /** Everything short of saving: coordinates, name and the confirmation. */
  async draft(name: string, points: Point[] = northbound) {
    await this.plot(points);
    await this.name(name);
    await this.confirmOwnership();
  }

  async save() {
    await this.saveButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async restore() {
    await this.restoreButton.click();
  }

  /** Reverse sits in the point list, so the list opens first. */
  async reverse() {
    await this.showPoints();
    await this.reverseButton.click();
  }

  async undoPoint() {
    await this.undoPointButton.click();
  }

  async showPoints() {
    if (!(await this.reverseButton.isVisible())) await this.pointsToggle.click();
  }

  /** Draws, saves and waits for the save to land. */
  async drawSegment(name: string, points: Point[] = northbound) {
    await this.draft(name, points);
    await this.save();
    await expect(this.page.locator("p[role=status]")).toHaveText("Segment saved on this browser.");
  }
}
