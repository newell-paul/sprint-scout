import {
  aRoute,
  expect,
  loadTerrain,
  reverseAndSave,
  segmentTime,
  terrainPanel,
  test,
} from "./fixtures";

const seeded = (targetTimeS?: number) => [
  aRoute(targetTimeS === undefined ? {} : { targetTimeS }),
];

test(
  "terrain loads only after consent and changes the estimate",
  { tag: ["@smoke"] },
  async ({ page, seed, openMeteo }) => {
    await seed({ routes: seeded(90) });
    const time = segmentTime(page);
    await expect(time).not.toHaveText("Unavailable");
    const flatTime = await time.innerText();
    const panel = terrainPanel(page);
    await expect(
      panel.getByRole("button", { name: "Load terrain", exact: true }),
    ).toBeDisabled();
    expect(openMeteo.calls.elevation).toBe(0);
    await loadTerrain(page);
    await expect(time).not.toHaveText(flatTime);
    await expect(page.getByTestId("ride-cockpit")).toContainText(
      "Still air · same terrain",
    );
    await expect(panel.getByRole("img")).toBeVisible();
    await expect(page.getByTestId("target-comparison")).toContainText(
      "Target 1m 30s",
    );
    expect(openMeteo.calls).toEqual({ weather: 1, elevation: 1, archive: 0 });
  },
);

test(
  "terrain panel lists the sampled elevations",
  { tag: ["@a11y"] },
  async ({ page, seed, aria }) => {
    await seed({ routes: seeded() });
    await loadTerrain(page);
    const panel = terrainPanel(page);
    await panel
      .getByText("Elevation samples & source", { exact: true })
      .click();
    await expect(panel.locator("tbody tr")).toHaveCount(13);
    await aria("terrain-panel-enabled", panel);
  },
);

test("terrain persists across reload without a new elevation request", async ({
  page,
  seed,
  openMeteo,
}) => {
  await seed({ routes: seeded() });
  await loadTerrain(page);
  const terrainTime = await segmentTime(page).innerText();
  await page.reload();
  await expect(segmentTime(page)).toHaveText(terrainTime);
  await expect(
    terrainPanel(page).getByRole("checkbox", { name: /Share sampled/ }),
  ).not.toBeChecked();
  expect(openMeteo.calls.elevation).toBe(1);
});

test("board ranks with the terrain model and opens the same estimate", async ({
  page,
  seed,
  openMeteo,
}) => {
  await seed({ routes: seeded() });
  await loadTerrain(page);
  const terrainTime = await segmentTime(page).innerText();
  await page.getByRole("button", { name: "Rank my segments" }).click();
  const row = page.getByTestId("board-row");
  await expect(row).toContainText("Terrain-aware");
  await row.getByRole("button", { name: "Open" }).click();
  await expect(segmentTime(page)).toHaveText(terrainTime);
  expect(openMeteo.calls.weather).toBe(1);
});

test("flat-road and terrain modes switch without new requests", async ({
  page,
  seed,
  openMeteo,
}) => {
  await seed({ routes: seeded() });
  const time = segmentTime(page);
  await expect(time).not.toHaveText("Unavailable");
  const flatTime = await time.innerText();
  await loadTerrain(page);
  const terrainTime = await time.innerText();
  const panel = terrainPanel(page);
  await panel.getByRole("button", { name: "Flat road", exact: true }).click();
  await expect(time).toHaveText(flatTime);
  await panel.getByRole("button", { name: "Terrain", exact: true }).click();
  await expect(time).toHaveText(terrainTime);
  expect(openMeteo.calls).toEqual({ weather: 1, elevation: 1, archive: 0 });
});

test("terrain heights follow the speed unit", async ({ page, seed }) => {
  await seed({ routes: seeded() });
  await loadTerrain(page);
  const terrainTime = await segmentTime(page).innerText();
  await page
    .getByRole("group", { name: "Speed units" })
    .getByRole("button", { name: "mph", exact: true })
    .click();
  await expect(segmentTime(page)).toHaveText(terrainTime);
  await expect(terrainPanel(page)).toContainText("ft");
});

test(
  "terrain panel fits a phone viewport",
  { tag: ["@mobile"] },
  async ({ page, seed }) => {
    await seed({ routes: seeded() });
    await loadTerrain(page);
    const width = page.viewportSize()!.width;
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
  },
);

test("a geometry edit invalidates terrain until it is reloaded", async ({
  page,
  seed,
}) => {
  await seed({ routes: seeded(90) });
  await loadTerrain(page);
  const time = segmentTime(page);
  const terrainTime = await time.innerText();
  await reverseAndSave(page);
  await expect(time).toHaveText("Unavailable");
  const panel = terrainPanel(page);
  await expect(panel).toContainText("Terrain estimates are unavailable");
  await expect(page.getByTestId("target-comparison")).toContainText(
    "Target 1m 30s",
  );
  await loadTerrain(page);
  await expect(time).not.toHaveText("Unavailable");
  await expect(time).not.toHaveText(terrainTime);
});

test("removing elevation returns to flat-road mode and persists", async ({
  page,
  seed,
}) => {
  await seed({ routes: seeded() });
  await loadTerrain(page);
  const panel = terrainPanel(page);
  await panel
    .getByRole("button", { name: "Remove elevation", exact: true })
    .click();
  await expect(panel.getByRole("heading")).toHaveText(
    "Terrain · Flat-road mode",
  );
  await page.reload();
  await expect(panel.getByRole("heading")).toHaveText(
    "Terrain · Flat-road mode",
  );
  await expect(panel.getByRole("img")).toHaveCount(0);
});

test("incomplete elevation is reported and leaves the estimate unchanged", async ({
  page,
  seed,
  openMeteo,
}) => {
  await seed({ routes: seeded() });
  const time = segmentTime(page);
  await expect(time).not.toHaveText("Unavailable");
  const flatTime = await time.innerText();
  openMeteo.faults.elevation = "incomplete";
  const panel = terrainPanel(page);
  await panel.getByRole("checkbox", { name: /Share sampled/ }).check();
  await panel
    .getByRole("button", { name: "Load terrain", exact: true })
    .click();
  await expect(panel).toContainText("Elevation is incomplete or invalid");
  await expect(time).toHaveText(flatTime);
  await expect(panel.getByRole("img")).toHaveCount(0);
});

test("automatic reload fetches new elevation after a geometry edit", async ({
  page,
  seed,
  openMeteo,
}) => {
  await seed({ routes: seeded() });
  const time = segmentTime(page);
  await expect(time).not.toHaveText("Unavailable");
  const panel = terrainPanel(page);
  const auto = panel.getByRole("checkbox", { name: /automatically/ });
  await expect(auto).toBeDisabled();
  await panel.getByRole("checkbox", { name: /Share sampled/ }).check();
  await auto.check();
  await panel
    .getByRole("button", { name: "Load terrain", exact: true })
    .click();
  await expect(panel.getByRole("heading")).toHaveText("Terrain · Enabled");
  const terrainTime = await time.innerText();
  await page.reload();
  await expect(auto).toBeChecked();
  expect(openMeteo.calls.elevation).toBe(1);
  await reverseAndSave(page);
  await expect(panel).toContainText(
    "Terrain loaded and saved in this browser.",
  );
  await expect(panel.getByRole("heading")).toHaveText("Terrain · Enabled");
  expect(openMeteo.calls.elevation).toBe(2);
  await expect(time).not.toHaveText("Unavailable");
  await expect(time).not.toHaveText(terrainTime);
});

test("removing elevation switches automatic reload off", async ({
  page,
  seed,
  openMeteo,
}) => {
  await seed({ routes: seeded() });
  const panel = terrainPanel(page);
  const auto = panel.getByRole("checkbox", { name: /automatically/ });
  await panel.getByRole("checkbox", { name: /Share sampled/ }).check();
  await auto.check();
  await panel
    .getByRole("button", { name: "Load terrain", exact: true })
    .click();
  await expect(panel.getByRole("heading")).toHaveText("Terrain · Enabled");
  await panel
    .getByRole("button", { name: "Remove elevation", exact: true })
    .click();
  await expect(auto).not.toBeChecked();
  expect(openMeteo.calls.elevation).toBe(1);
});

test("a late elevation response cannot restore a deleted segment", async ({
  page,
  seed,
  openMeteo,
}) => {
  openMeteo.faults.weather = "outage";
  const held = openMeteo.holdElevation();
  await seed({ routes: seeded() });
  const panel = terrainPanel(page);
  await panel.getByRole("checkbox", { name: /Share sampled/ }).check();
  await panel
    .getByRole("button", { name: "Load terrain", exact: true })
    .click();
  await held.started;
  await page.getByText("Manage", { exact: true }).click();
  await page
    .getByRole("button", { name: "Delete segment", exact: true })
    .click();
  held.release();
  await expect(panel).toHaveCount(0);
  await page.reload();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("sprint-scout.drawn-routes.v1")!),
    ),
  ).toEqual([]);
});
