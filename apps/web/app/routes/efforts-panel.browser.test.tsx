import { afterEach, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
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

it("an import that skipped points says how many", async () => {
  const start = Date.parse("2026-09-12T09:00:00Z");
  const timed = Array.from({ length: 160 }, (_, k) => {
    const time = new Date(start + k * 1000).toISOString();
    return `<trkpt lat="${51.4973 + k * 0.00009}" lon="-0.12"><time>${time}</time></trkpt>`;
  });
  const untimed = `<trkpt lat="51.497" lon="-0.12"><ele>1</ele></trkpt>`;
  const zoneless = `<trkpt lat="51.4971" lon="-0.12"><time>2026-09-12T08:59:59</time></trkpt>`;
  const file = new File(
    [
      `<?xml version="1.0"?><gpx version="1.1"><trk><trkseg>${untimed}${zoneless}${timed.join("")}</trkseg></trk></gpx>`,
    ],
    "gappy.gpx",
    { type: "application/gpx+xml" },
  );
  const { screen } = await renderPanel([anEffort("a", "2026-09-01T07:00:00Z")]);
  await screen.getByLabelText(/my own device recording/).click();

  await userEvent.upload(screen.getByLabelText(/Import GPX/), file);

  await expect
    .element(screen.getByText(/1 effort added from gappy\.gpx/))
    .toHaveTextContent(
      "2 track points were skipped for a missing or out-of-order time or position; 1 had a time with no zone.",
    );
});

it("efforts on more date ranges than one load allows finish on the next press", async () => {
  const efforts = Array.from({ length: 31 }, (_, k) =>
    anEffort(`e${k}`, new Date(Date.UTC(2026, 6, 1 + 2 * k, 7)).toISOString()),
  );
  const { screen, saved } = await renderPanel(efforts);
  const load = screen.getByRole("button", { name: "Load past wind" });

  await load.click();

  await expect
    .element(screen.getByText(/Past wind saved for 30 efforts/))
    .toHaveTextContent(
      "1 more on other dates still need wind; press Load past wind again.",
    );

  await load.click();

  await expect
    .element(screen.getByText(/Past wind saved for 1 effort from/))
    .not.toHaveTextContent("press Load past wind again");
  expect(saved.at(-1)!.filter((effort) => effort.wind === null)).toEqual([]);
});

it("a file over 25 MB is refused before it is read", async () => {
  const read = vi.spyOn(File.prototype, "text");
  const { screen } = await renderPanel([anEffort("a", "2026-09-01T07:00:00Z")]);
  await screen.getByLabelText(/my own device recording/).click();
  // Built in the page: userEvent.upload would copy 25 MB through the driver.
  const files = new DataTransfer();
  files.items.add(new File([new Uint8Array(25_000_001)], "huge.gpx"));
  const input = screen
    .getByLabelText(/Import GPX/)
    .element() as HTMLInputElement;

  input.files = files.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));

  await expect
    .element(screen.getByText("GPX file is missing or larger than 25 MB."))
    .toBeVisible();
  expect(read).not.toHaveBeenCalled();
  read.mockRestore();
});
