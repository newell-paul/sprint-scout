import { afterEach, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react/pure";
import type { RouteEffort } from "./library";
import EffortsPanel from "./efforts-panel";
import {
  aRoute,
  northbound,
  openMeteo,
  resetOpenMeteo,
  rider,
} from "../../test/fixtures";

afterEach(resetOpenMeteo);

const anEffort = (id: string, startedAt: string): RouteEffort => ({
  id,
  startedAt,
  elapsedSeconds: 95,
  source: "gpx",
  fileName: "ride.gpx",
  geometryKey: JSON.stringify(northbound),
  maxDeviationM: 3,
  sampleGapSeconds: 1,
  importedAt: "2026-09-02T07:00:00Z",
  wind: null,
});

/** Renders the panel over a stored list that onChange updates, as the planner does. */
async function renderPanel(efforts: RouteEffort[]) {
  let stored = efforts;
  const saved: RouteEffort[][] = [];
  const panel = (list: RouteEffort[]) => (
    <EffortsPanel
      route={aRoute({ efforts: list })}
      rider={rider}
      unit="km/h"
      onChange={(next) => {
        stored = next;
        saved.push(next);
        void screen.rerender(panel(stored));
        return true;
      }}
    />
  );
  const screen = await render(panel(stored));
  await screen.getByLabelText(/Share this segment.s start coordinate/).click();
  return { screen, saved };
}

it("an effort removed while past wind loads stays removed", async () => {
  openMeteo.faults.archive = "slow";
  const { screen, saved } = await renderPanel([
    anEffort("a", "2026-09-01T07:00:00Z"),
    anEffort("b", "2026-09-02T07:00:00Z"),
  ]);

  await screen.getByRole("button", { name: "Load past wind" }).click();
  await screen
    .getByRole("button", { name: /Remove effort from 1 Sep/ })
    .click();

  await expect.element(screen.getByText(/Past wind saved for/)).toBeVisible();
  expect(saved.at(-1)!.map((effort) => effort.id)).toEqual(["b"]);
  await expect.element(screen.getByTestId("effort-row")).toBeVisible();
});

it("a past-wind load that times out says so", async () => {
  openMeteo.faults.archive = "timeout";
  const { screen } = await renderPanel([anEffort("a", "2026-09-01T07:00:00Z")]);
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });

  await screen.getByRole("button", { name: "Load past wind" }).click();
  vi.advanceTimersByTime(20_000);
  vi.useFakeTimers({ toFake: ["Date"] });

  await expect
    .element(screen.getByText("Past wind timed out; try again."))
    .toBeVisible();
});
