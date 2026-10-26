import { aRoute, expect, test } from "./fixtures";

const seeded = (targetTimeS?: number) => ({
  routes: [aRoute(targetTimeS === undefined ? {} : { targetTimeS })],
});

test("terrain cannot load before consent", async ({ planner, seed, openMeteo }) => {
  await seed(seeded());

  await expect(planner.terrain.loadButton).toBeDisabled();
  expect(openMeteo.calls.elevation).toBe(0);
});

test("terrain loaded after consent changes the estimate", { tag: ["@smoke"] }, async ({ planner, seed, openMeteo }) => {
  await seed(seeded(90));
  await expect(planner.cockpit.segmentTime).not.toHaveText("Unavailable");
  const flatTime = await planner.cockpit.time();

  await planner.terrain.load();

  await expect(planner.cockpit.segmentTime).not.toHaveText(flatTime);
  await expect(planner.cockpit.region).toContainText("Still air · same terrain");
  await expect(planner.terrain.profile).toBeVisible();
  await expect(planner.attempt.comparison).toContainText("Target 1m 30s");
  expect(openMeteo.calls).toEqual({ weather: 1, elevation: 1, archive: 0 });
});

test("terrain panel lists the sampled elevations", { tag: ["@a11y"] }, async ({ planner, seed, aria }) => {
  await seed(seeded());
  await planner.terrain.load();

  await planner.terrain.showSamples();

  await expect(planner.terrain.samples).toHaveCount(13);
  await aria("terrain-panel-enabled", planner.terrain.region);
});

test("terrain persists across reload without a new elevation request", async ({ planner, seed, openMeteo }) => {
  await seed(seeded());
  await planner.terrain.load();
  const terrainTime = await planner.cockpit.time();

  await planner.reload();

  await expect(planner.cockpit.segmentTime).toHaveText(terrainTime);
  await expect(planner.terrain.consent).not.toBeChecked();
  expect(openMeteo.calls.elevation).toBe(1);
});

test("opening from the board gives the same terrain estimate", async ({ planner, seed, openMeteo }) => {
  await seed(seeded());
  await planner.terrain.load();
  const terrainTime = await planner.cockpit.time();
  await planner.board.rank();

  await planner.board.open("Test hill");

  await expect(planner.cockpit.segmentTime).toHaveText(terrainTime);
  expect(openMeteo.calls.weather).toBe(1);
});

test("flat-road mode restores the flat estimate without a new request", async ({ planner, seed, openMeteo }) => {
  await seed(seeded());
  await expect(planner.cockpit.segmentTime).not.toHaveText("Unavailable");
  const flatTime = await planner.cockpit.time();
  await planner.terrain.load();

  await planner.terrain.useFlatRoad();

  await expect(planner.cockpit.segmentTime).toHaveText(flatTime);
  expect(openMeteo.calls).toEqual({ weather: 1, elevation: 1, archive: 0 });
});

test("terrain mode restores the terrain estimate without a new request", async ({ planner, seed, openMeteo }) => {
  await seed(seeded());
  await planner.terrain.load();
  const terrainTime = await planner.cockpit.time();
  await planner.terrain.useFlatRoad();
  await expect(planner.cockpit.segmentTime).not.toHaveText(terrainTime);

  await planner.terrain.useTerrain();

  await expect(planner.cockpit.segmentTime).toHaveText(terrainTime);
  expect(openMeteo.calls).toEqual({ weather: 1, elevation: 1, archive: 0 });
});

test("terrain panel fits a phone viewport", { tag: ["@mobile"] }, async ({ planner, seed }) => {
  await seed(seeded());

  await planner.terrain.load();

  expect(await planner.horizontalOverflow()).toBe(0);
});

test("a geometry edit invalidates terrain", async ({ planner, seed }) => {
  await seed(seeded(90));
  await planner.terrain.load();

  await planner.reverseSegment();

  await expect(planner.cockpit.segmentTime).toHaveText("Unavailable");
  await expect(planner.terrain.region).toContainText("Terrain estimates are unavailable");
  await expect(planner.attempt.comparison).toContainText("Target 1m 30s");
});

test("terrain reloaded after a geometry edit gives a new estimate", async ({ planner, seed }) => {
  await seed(seeded(90));
  await planner.terrain.load();
  const terrainTime = await planner.cockpit.time();
  await planner.reverseSegment();
  await expect(planner.cockpit.segmentTime).toHaveText("Unavailable");

  await planner.terrain.load();

  await expect(planner.cockpit.segmentTime).not.toHaveText("Unavailable");
  await expect(planner.cockpit.segmentTime).not.toHaveText(terrainTime);
});

test("flat-road mode after removing elevation persists", async ({ planner, seed }) => {
  await seed(seeded());
  await planner.terrain.load();
  await planner.terrain.remove();
  await expect(planner.terrain.heading).toHaveText("Terrain · Flat-road mode");

  await planner.reload();

  await expect(planner.terrain.heading).toHaveText("Terrain · Flat-road mode");
  await expect(planner.terrain.profile).toHaveCount(0);
});

test("automatic reload persists across reload", async ({ planner, seed, openMeteo }) => {
  await seed(seeded());
  await planner.terrain.giveConsent();
  await planner.terrain.reloadAutomatically();
  await planner.terrain.load();

  await planner.reload();

  await expect(planner.terrain.automatic).toBeChecked();
  expect(openMeteo.calls.elevation).toBe(1);
});

test("automatic reload fetches new elevation after a geometry edit", async ({ planner, seed, openMeteo }) => {
  await seed(seeded());
  await planner.terrain.giveConsent();
  await planner.terrain.reloadAutomatically();
  await planner.terrain.load();
  const terrainTime = await planner.cockpit.time();

  await planner.reverseSegment();

  await expect(planner.terrain.region).toContainText("Terrain loaded and saved in this browser.");
  await expect(planner.terrain.heading).toHaveText("Terrain · Enabled");
  expect(openMeteo.calls.elevation).toBe(2);
  await expect(planner.cockpit.segmentTime).not.toHaveText("Unavailable");
  await expect(planner.cockpit.segmentTime).not.toHaveText(terrainTime);
});

test("a late elevation response cannot restore a deleted segment", async ({ planner, seed, openMeteo }) => {
  openMeteo.faults.weather = "outage";
  const held = openMeteo.holdElevation();
  await seed(seeded());
  await planner.terrain.requestTerrain();
  await held.started;

  await planner.library.delete();
  held.release();

  await expect(planner.terrain.region).toHaveCount(0);

  await planner.reload();

  expect(JSON.parse((await planner.storedRoutes())!)).toEqual([]);
});
