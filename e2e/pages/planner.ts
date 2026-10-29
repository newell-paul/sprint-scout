import type { Locator, Page } from "@playwright/test";
import { horizontalOverflow } from "./canvas";
import { Attempt } from "./attempt";
import { Board } from "./board";
import { Cockpit } from "./cockpit";
import { SegmentEditor } from "./editor";
import { EffortsPanel } from "./efforts";
import { SegmentLibrary } from "./library";
import { PlannerMap } from "./map";
import { RideSource } from "./ride";
import { DataPrivacy } from "./privacy";
import { RiderPanel } from "./rider";
import { Shelter } from "./shelter";
import { TerrainPanel } from "./terrain";
import { Timeline } from "./timeline";

export const routesKey = "sprint-scout.drawn-routes.v1";

/** The planner at `/`, one property per panel the rider works with. */
export class Planner {
  readonly library: SegmentLibrary;
  readonly editor: SegmentEditor;
  readonly ride: RideSource;
  readonly timeline: Timeline;
  readonly cockpit: Cockpit;
  readonly map: PlannerMap;
  readonly attempt: Attempt;
  readonly rider: RiderPanel;
  readonly shelter: Shelter;
  readonly terrain: TerrainPanel;
  readonly efforts: EffortsPanel;
  readonly board: Board;
  readonly privacy: DataPrivacy;
  readonly status: Locator;
  readonly alert: Locator;
  readonly demoLink: Locator;

  constructor(readonly page: Page) {
    this.library = new SegmentLibrary(page);
    this.editor = new SegmentEditor(page);
    this.ride = new RideSource(page);
    this.timeline = new Timeline(page);
    this.cockpit = new Cockpit(page);
    this.map = new PlannerMap(page);
    this.attempt = new Attempt(page);
    this.rider = new RiderPanel(page);
    this.shelter = new Shelter(page);
    this.terrain = new TerrainPanel(page);
    this.efforts = new EffortsPanel(page);
    this.board = new Board(page);
    this.privacy = new DataPrivacy(page);
    this.status = page.locator("p[role=status]");
    this.alert = page.locator("p[role=alert]");
    this.demoLink = page.getByRole("link", { name: "Back to demo planner" });
  }

  async open() {
    await this.page.goto("/");
  }

  /** Opens the planner over a raw stored library, readable or not. */
  async openWithStoredRoutes(raw: string) {
    await this.page.goto("/health");
    await this.page.evaluate(([key, value]) => localStorage.setItem(key, value), [routesKey, raw] as const);
    await this.open();
  }

  async openLegacyAddress() {
    await this.page.goto("/routes");
  }

  async reload() {
    await this.page.reload();
  }

  async useMph() {
    await this.page
      .getByRole("group", { name: "Speed units" })
      .getByRole("button", { name: "mph", exact: true })
      .click();
  }

  /** Redraws the selected segment reversed and saves it: the standard geometry edit. */
  async reverseSegment() {
    await this.library.redraw();
    await this.editor.reverse();
    await this.editor.confirmOwnership();
    await this.editor.save();
  }

  /** Pixels the page is wider than the viewport; 0 means no sideways scroll. */
  horizontalOverflow() {
    return horizontalOverflow(this.page);
  }

  /** The raw stored library, as the next page load will read it. */
  storedRoutes() {
    return this.page.evaluate((key) => localStorage.getItem(key), routesKey);
  }
}
