import { aRoute, expect, test } from "./fixtures";

const seeded = { routes: [aRoute()] };

test(
  "a GPX ride adds one effort per traversal without leaving the browser",
  { tag: ["@smoke"] },
  async ({ planner, seed, openMeteo }) => {
    await seed(seeded);
    await expect(planner.cockpit.segmentTime).not.toHaveText("Unavailable");

    await planner.efforts.importGpx("northbound-two-laps");

    const { efforts } = planner;
    await expect(efforts.rows).toHaveCount(2);
    await expect(efforts.status).toContainText(
      "2 efforts added from northbound-two-laps.gpx",
    );
    await expect(efforts.heading).toContainText("Best 1m 4");
    await expect(efforts.time(0)).toHaveText(/^1m 4\ds$/);
    expect(openMeteo.calls).toEqual({ weather: 1, elevation: 0, archive: 0 });
  },
);

test("imported efforts persist across reload", async ({ planner, seed }) => {
  await seed(seeded);
  await planner.efforts.importGpx("northbound-two-laps");
  await expect(planner.efforts.rows).toHaveCount(2);

  await planner.reload();

  await expect(planner.efforts.rows).toHaveCount(2);
});

test("importing the same ride twice does not duplicate efforts", async ({
  planner,
  seed,
}) => {
  await seed(seeded);
  await planner.efforts.importGpx("northbound-two-laps");
  await expect(planner.efforts.rows).toHaveCount(2);

  await planner.efforts.importGpx("northbound-two-laps");

  await expect(planner.efforts.status).toContainText("already saved");
  await expect(planner.efforts.rows).toHaveCount(2);
});

test("a ride in the opposite direction matches nothing", async ({
  planner,
  seed,
}) => {
  await seed(seeded);

  await planner.efforts.importGpx("northbound-reversed");

  await expect(planner.efforts.status).toContainText(
    "No traversal of this segment found in northbound-reversed.gpx",
  );
  await expect(planner.efforts.rows).toHaveCount(0);
});

test("a file without track points is rejected with a clear message", async ({
  planner,
  seed,
}) => {
  await seed(seeded);

  await planner.efforts.importGpx("not-a-track");

  await expect(planner.efforts.status).toContainText(
    "GPX file contains no track points.",
  );
});

test("an effort can be removed", async ({ planner, seed }) => {
  await seed(seeded);
  await planner.efforts.importGpx("northbound-two-laps");
  await expect(planner.efforts.rows).toHaveCount(2);

  await planner.efforts.remove(0);

  await expect(planner.efforts.rows).toHaveCount(1);
});

test("a removed effort stays removed after reload", async ({
  planner,
  seed,
}) => {
  await seed(seeded);
  await planner.efforts.importGpx("northbound-two-laps");
  await planner.efforts.remove(0);
  await expect(planner.efforts.rows).toHaveCount(1);

  await planner.reload();

  await expect(planner.efforts.rows).toHaveCount(1);
});

test("a geometry edit discards efforts matched to the old line", async ({
  planner,
  seed,
}) => {
  await seed(seeded);
  await planner.efforts.importGpx("northbound-two-laps");
  await expect(planner.efforts.rows).toHaveCount(2);

  await planner.reverseSegment();

  await expect(planner.efforts.region).toBeVisible();
  await expect(planner.efforts.rows).toHaveCount(0);
});

test(
  "efforts panel is keyboard reachable and described",
  { tag: ["@a11y"] },
  async ({ planner, seed, aria }) => {
    await seed(seeded);

    await planner.efforts.importGpx("northbound-two-laps");

    await expect(planner.efforts.rows).toHaveCount(2);
    await aria("efforts-panel-two-laps", planner.efforts.region);
  },
);

test("import is disabled until the recording is confirmed as the rider's own", async ({
  planner,
  seed,
}) => {
  await seed(seeded);

  await expect(planner.efforts.importInput).toBeDisabled();
});

test("confirming the recording as the rider's own enables import", async ({
  planner,
  seed,
}) => {
  await seed(seeded);

  await planner.efforts.confirmOwnRecording();

  await expect(planner.efforts.importInput).toBeEnabled();
});

test("past wind cannot load before consent", async ({
  planner,
  seed,
  openMeteo,
}) => {
  await seed(seeded);

  await planner.efforts.importGpx("northbound-two-laps");

  await expect(planner.efforts.rows).toHaveCount(2);
  await expect(planner.efforts.winds.first()).toHaveText("Not loaded");
  await expect(planner.efforts.loadPastWindButton).toBeDisabled();
  expect(openMeteo.calls.archive).toBe(0);
});

test("past wind loads after consent and is saved with the effort", async ({
  planner,
  seed,
  openMeteo,
}) => {
  await seed(seeded);
  await planner.efforts.importGpx("northbound-two-laps");
  await expect(planner.efforts.rows).toHaveCount(2);

  await planner.efforts.loadPastWind();

  const { efforts } = planner;
  await expect(efforts.status).toContainText("Past wind saved for 2 efforts");
  await expect(efforts.winds.first()).toContainText("Tailwind");
  await expect(efforts.winds.first()).toContainText("18.0 km/h");
  await expect(efforts.winds.first()).toContainText("model −");
  expect(openMeteo.calls.archive).toBe(1);
  await expect(efforts.loadPastWindButton).toBeDisabled();
});

test("saved past wind survives a reload without a new request", async ({
  planner,
  seed,
  openMeteo,
}) => {
  await seed(seeded);
  await planner.efforts.importGpx("northbound-two-laps");
  await expect(planner.efforts.rows).toHaveCount(2);
  await planner.efforts.loadPastWind();
  await expect(planner.efforts.status).toContainText("Past wind saved");

  await planner.reload();

  await expect(planner.efforts.winds.first()).toContainText("Tailwind");
  expect(openMeteo.calls.archive).toBe(1);
});

test("an archive outage leaves efforts without wind and says so", async ({
  planner,
  seed,
  openMeteo,
}) => {
  await seed(seeded);
  await planner.efforts.importGpx("northbound-two-laps");
  await expect(planner.efforts.rows).toHaveCount(2);
  openMeteo.faults.archive = "outage";

  await planner.efforts.loadPastWind();

  await expect(planner.efforts.status).toContainText(
    "Weather archive unavailable",
  );
  await expect(planner.efforts.winds.first()).toHaveText("Not loaded");
});
