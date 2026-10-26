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

/** A GPX file of 11 m/s laps along `northbound`, run in from 200 m out and on 200 m past the finish. */
function aRide(name: string, { laps = 2, reverse = false } = {}) {
  const metresPerDegree = 111_195;
  const latitudes = northbound.map(([, lat]) => lat);
  const [from, to] = (reverse ? latitudes.reverse() : latitudes) as [
    number,
    number,
  ];
  const lengthM = Math.abs(to - from) * metresPerDegree;
  const step = Math.sign(to - from) / metresPerDegree;
  const points: string[] = [];
  let at = Date.parse("2026-09-12T09:00:00Z");
  for (let lap = 0; lap < laps; lap++) {
    for (let d = -200; d <= lengthM + 200; d += 11) {
      const time = new Date(at).toISOString();
      points.push(
        `<trkpt lat="${(from + d * step).toFixed(6)}" lon="-0.12"><time>${time}</time></trkpt>`,
      );
      at += 1000;
    }
    at += 90_000;
  }
  return new File(
    [
      `<?xml version="1.0"?><gpx version="1.1"><trk><trkseg>${points.join("")}</trkseg></trk></gpx>`,
    ],
    name,
    { type: "application/gpx+xml" },
  );
}

/**
 * Renders the panel over a stored list that onChange updates, as the planner
 * does; the past wind consent only exists once there are efforts.
 */
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
  if (efforts.length > 0)
    await screen
      .getByLabelText(/Share this segment.s start coordinate/)
      .click();
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

it("the same ride imported twice adds no duplicate efforts", async () => {
  const { screen, saved } = await renderPanel([]);
  await screen.getByLabelText(/my own device recording/).click();
  const input = screen.getByLabelText("Import GPX ride");
  await userEvent.upload(input, aRide("northbound-two-laps.gpx"));
  await expect
    .element(screen.getByText(/2 efforts added from northbound-two-laps\.gpx/))
    .toBeVisible();

  await userEvent.upload(input, aRide("northbound-two-laps.gpx"));

  await expect
    .element(screen.getByRole("status"))
    .toHaveTextContent("Those efforts are already saved for this segment.");
  expect(screen.getByTestId("effort-row").elements()).toHaveLength(2);
  expect(saved).toHaveLength(1);
});

it("a ride in the opposite direction matches nothing", async () => {
  const { screen, saved } = await renderPanel([]);
  await screen.getByLabelText(/my own device recording/).click();

  await userEvent.upload(
    screen.getByLabelText("Import GPX ride"),
    aRide("northbound-reversed.gpx", { laps: 1, reverse: true }),
  );

  await expect
    .element(screen.getByRole("status"))
    .toHaveTextContent(
      "No traversal of this segment found in northbound-reversed.gpx",
    );
  expect(screen.getByTestId("effort-row").elements()).toHaveLength(0);
  expect(saved).toEqual([]);
});

it("a file without track points is rejected with a clear message", async () => {
  const waypointOnly = new File(
    [
      `<?xml version="1.0"?><gpx version="1.1"><wpt lat="51.5" lon="-0.12"><name>Cafe</name></wpt></gpx>`,
    ],
    "not-a-track.gpx",
    { type: "application/gpx+xml" },
  );
  const { screen, saved } = await renderPanel([]);
  await screen.getByLabelText(/my own device recording/).click();

  await userEvent.upload(
    screen.getByLabelText("Import GPX ride"),
    waypointOnly,
  );

  await expect
    .element(screen.getByRole("status"))
    .toHaveTextContent("GPX file contains no track points.");
  expect(saved).toEqual([]);
});

it("import is disabled until the recording is confirmed as the rider's own", async () => {
  const { screen } = await renderPanel([]);

  await expect.element(screen.getByLabelText("Import GPX ride")).toBeDisabled();
});

it("confirming the recording as the rider's own enables import", async () => {
  const { screen } = await renderPanel([]);

  await screen.getByLabelText(/my own device recording/).click();

  await expect.element(screen.getByLabelText("Import GPX ride")).toBeEnabled();
});

/** An effort as imported: no wind key yet, which reads "Not loaded" where null reads "Unavailable". */
const unloaded = (id: string, startedAt: string): RouteEffort => {
  const effort = anEffort(id, startedAt);
  delete effort.wind;
  return effort;
};

it("past wind loads after consent and is saved with the effort", async () => {
  const { screen, saved } = await renderPanel([
    unloaded("a", "2026-09-12T09:00:00Z"),
    unloaded("b", "2026-09-12T09:03:30Z"),
  ]);

  await screen.getByRole("button", { name: "Load past wind" }).click();

  await expect
    .element(screen.getByRole("status"))
    .toHaveTextContent("Past wind saved for 2 efforts");
  const wind = screen.getByTestId("effort-wind").first();
  await expect.element(wind).toHaveTextContent("Tailwind");
  await expect.element(wind).toHaveTextContent("18.0 km/h");
  await expect.element(wind).toHaveTextContent("model −");
  await expect
    .element(screen.getByRole("button", { name: "Load past wind" }))
    .toBeDisabled();
  expect(saved.at(-1)!.map((effort) => effort.wind?.speedMps)).toEqual([5, 5]);
});

it("an archive outage leaves efforts without wind and says so", async () => {
  openMeteo.faults.archive = "outage";
  const { screen, saved } = await renderPanel([
    unloaded("a", "2026-09-12T09:00:00Z"),
    unloaded("b", "2026-09-12T09:03:30Z"),
  ]);

  await screen.getByRole("button", { name: "Load past wind" }).click();

  await expect
    .element(screen.getByRole("status"))
    .toHaveTextContent("Weather archive unavailable");
  await expect
    .element(screen.getByTestId("effort-wind").first())
    .toHaveTextContent(/^Not loaded$/);
  expect(saved).toEqual([]);
});
