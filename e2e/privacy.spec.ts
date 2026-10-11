import { aRoute, expect, loadTerrain, terrainPanel, test } from "./fixtures";

const seeded = { routes: [aRoute({ id: "north", name: "Northbound" })] };
const hosts = (urls: string[]) =>
  Array.from(new Set(urls.map((url) => new URL(url).host))).sort();

test("no elevation request leaves the page before the consent box is ticked", async ({
  page,
  seed,
  openMeteo,
  externalRequests,
}) => {
  await seed(seeded);
  const panel = terrainPanel(page);
  await expect(
    panel.getByRole("button", { name: "Load terrain", exact: true }),
  ).toBeDisabled();
  await expect(
    panel.getByRole("checkbox", { name: /Reload terrain automatically/ }),
  ).toBeDisabled();
  expect(openMeteo.calls.elevation).toBe(0);
  expect(
    externalRequests.filter((url) =>
      url.includes("api.open-meteo.com/v1/elevation"),
    ),
  ).toEqual([]);
  await loadTerrain(page);
  expect(openMeteo.calls.elevation).toBe(1);
});

test("no archive request leaves the page before past-wind consent", async ({
  page,
  seed,
  openMeteo,
  externalRequests,
}) => {
  await seed({
    routes: [
      aRoute({
        id: "north",
        efforts: [
          {
            id: "e1",
            startedAt: "2026-09-01T07:00:00Z",
            elapsedSeconds: 95,
            source: "gpx",
            fileName: "ride.gpx",
            geometryKey: JSON.stringify([
              [-0.12, 51.5],
              [-0.12, 51.51],
            ]),
            maxDeviationM: 3,
            sampleGapSeconds: 1,
            importedAt: "2026-09-02T07:00:00Z",
            wind: null,
          },
        ],
      }),
    ],
  });
  const efforts = page.getByTestId("efforts-panel");
  await expect(
    efforts.getByRole("button", { name: "Load past wind", exact: true }),
  ).toBeDisabled();
  expect(openMeteo.calls.archive).toBe(0);
  expect(externalRequests.filter((url) => url.includes("archive-api"))).toEqual(
    [],
  );
});

test("only Open-Meteo and the map tiles are contacted during a full ranking", async ({
  page,
  seed,
  externalRequests,
}) => {
  await seed({
    routes: [
      aRoute({ id: "north", name: "Northbound", slot: 0 }),
      aRoute({
        id: "south",
        name: "Southbound",
        slot: 1,
        points: [
          [-0.2, 51.51],
          [-0.2, 51.5],
        ],
      }),
    ],
  });
  await page.getByRole("button", { name: "Rank my segments" }).click();
  await expect(page.getByTestId("board-row")).toHaveCount(2);
  await loadTerrain(page);
  const allowed = ["api.open-meteo.com", "tile.openstreetmap.org"];
  expect(hosts(externalRequests)).toContain("api.open-meteo.com");
  expect(
    hosts(externalRequests).filter((host) => !allowed.includes(host)),
  ).toEqual([]);
});

test("weather requests carry no referrer and no credentials", async ({
  page,
  seed,
}) => {
  // A cookie the browser would send if the request ever asked for credentials.
  await page.context().addCookies([
    {
      name: "tracker",
      value: "1",
      domain: "api.open-meteo.com",
      path: "/",
      // The page is another site, so only a SameSite=None cookie could travel.
      sameSite: "None",
      secure: true,
    },
  ]);
  // headers() hides cookie and other security headers; allHeaders() does not.
  const requests: Promise<Record<string, string>>[] = [];
  page.on("request", (request) => {
    if (request.url().includes("api.open-meteo.com"))
      requests.push(request.allHeaders());
  });
  await seed(seeded);
  await expect(page.getByTestId("wind-summary")).toBeVisible();
  expect(requests.length).toBeGreaterThan(0);
  for (const headers of await Promise.all(requests)) {
    expect(headers["referer"] ?? "").toBe("");
    expect(headers["cookie"] ?? "").toBe("");
  }
});

test("a weather request only ever carries the segment start, never the whole line", async ({
  page,
  seed,
  externalRequests,
}) => {
  await seed({
    routes: [
      aRoute({
        id: "long",
        points: [
          [-0.12, 51.5],
          [-0.13, 51.505],
          [-0.12, 51.51],
        ],
      }),
    ],
  });
  await expect(page.getByTestId("wind-summary")).toBeVisible();
  const forecast = externalRequests.find((url) => url.includes("/v1/forecast"));
  const params = new URL(forecast!).searchParams;
  expect(params.get("latitude")).toBe("51.5");
  expect(params.get("longitude")).toBe("-0.12");
  expect(forecast).not.toContain("51.505");
});

test("a drafted route sends nothing until it is saved, then only its start", async ({
  page,
  openMeteo,
  externalRequests,
}) => {
  await page.goto("/");
  await page.getByText("Enter coordinates instead", { exact: true }).click();
  for (const [longitude, latitude] of [
    [-0.31, 51.44],
    [-0.31, 51.45],
  ]) {
    await page.getByLabel("Latitude", { exact: true }).fill(String(latitude));
    await page.getByLabel("Longitude", { exact: true }).fill(String(longitude));
    await page
      .getByRole("button", { name: "Add point and centre map" })
      .click();
  }
  await page.getByLabel("Route name", { exact: true }).fill("Private draft");
  await page.getByRole("checkbox", { name: /created this route/ }).check();
  expect(openMeteo.calls).toEqual({ weather: 0, elevation: 0, archive: 0 });
  expect(externalRequests.filter((url) => url.includes("open-meteo"))).toEqual(
    [],
  );
  await page.getByRole("button", { name: "Save route", exact: true }).click();
  await expect.poll(() => openMeteo.weatherLongitudes).toEqual(["-0.31"]);
});
