import { aRoute, expect, test } from "./fixtures";

const seeded = { routes: [aRoute({ id: "north", name: "Northbound" })] };
const hosts = (urls: string[]) => Array.from(new Set(urls.map((url) => new URL(url).host))).sort();
const draftPoints: [number, number][] = [
  [-0.31, 51.44],
  [-0.31, 51.45],
];

test("no elevation request leaves the page before the consent box is ticked", async ({
  planner,
  seed,
  openMeteo,
  externalRequests,
}) => {
  await seed(seeded);

  await expect(planner.terrain.loadButton).toBeDisabled();
  await expect(planner.terrain.automatic).toBeDisabled();
  expect(openMeteo.calls.elevation).toBe(0);
  expect(externalRequests.filter((url) => url.includes("api.open-meteo.com/v1/elevation"))).toEqual([]);
});

test("no archive request leaves the page before past-wind consent", async ({
  planner,
  seed,
  openMeteo,
  externalRequests,
}) => {
  const effort = {
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
  };

  await seed({ routes: [aRoute({ id: "north", efforts: [effort] })] });

  await expect(planner.efforts.loadPastWindButton).toBeDisabled();
  expect(openMeteo.calls.archive).toBe(0);
  expect(externalRequests.filter((url) => url.includes("archive-api"))).toEqual([]);
});

test("only Open-Meteo and the map tiles are contacted during a full ranking", async ({
  planner,
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

  await planner.board.rank();
  await expect(planner.board.rows).toHaveCount(2);
  await planner.terrain.load();

  const allowed = ["api.open-meteo.com", "tile.openstreetmap.org"];
  expect(hosts(externalRequests)).toContain("api.open-meteo.com");
  expect(hosts(externalRequests).filter((host) => !allowed.includes(host))).toEqual([]);
});

test("weather requests carry no referrer and no credentials", async ({ page, planner, seed }) => {
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
    if (request.url().includes("api.open-meteo.com")) requests.push(request.allHeaders());
  });

  await seed(seeded);
  await expect(planner.cockpit.windSummary).toBeVisible();

  expect(requests.length).toBeGreaterThan(0);
  for (const headers of await Promise.all(requests)) {
    expect(headers["referer"] ?? "").toBe("");
    expect(headers["cookie"] ?? "").toBe("");
  }
});

test("a weather request only ever carries the segment start, never the whole line", async ({
  planner,
  seed,
  externalRequests,
}) => {
  const points: [number, number][] = [
    [-0.12, 51.5],
    [-0.13, 51.505],
    [-0.12, 51.51],
  ];

  await seed({ routes: [aRoute({ id: "long", points })] });
  await expect(planner.cockpit.windSummary).toBeVisible();

  const forecast = externalRequests.find((url) => url.includes("/v1/forecast"));
  const params = new URL(forecast!).searchParams;
  expect(params.get("latitude")).toBe("51.5");
  expect(params.get("longitude")).toBe("-0.12");
  expect(forecast).not.toContain("51.505");
});

test("a drafted route sends nothing before it is saved", async ({ planner, openMeteo, externalRequests }) => {
  await planner.open();

  await planner.editor.draft("Private draft", draftPoints);

  expect(openMeteo.calls).toEqual({ weather: 0, elevation: 0, archive: 0 });
  expect(externalRequests.filter((url) => url.includes("open-meteo"))).toEqual([]);
});

test("saving a drafted route sends only its start", async ({ planner, openMeteo }) => {
  await planner.open();
  await planner.editor.draft("Private draft", draftPoints);

  await planner.editor.save();

  await expect.poll(() => openMeteo.weatherLongitudes).toEqual(["-0.31"]);
});

test.describe("clearing saved data", () => {
  test.use({ firstVisit: true });

  test("deletes every segment and rider setting and starts again from the example @smoke", async ({
    page,
    planner,
    seed,
  }) => {
    await seed({
      routes: [aRoute({ id: "home", name: "Home loop" })],
      rider: { powerW: 300, massKg: 80, cdaM2: 0.3 },
    });
    await expect(planner.library.heading).toContainText("Home loop");

    await planner.privacy.clearSavedData();

    await expect(planner.library.heading).toContainText("Richmond Park (example)");
    expect(await page.evaluate(() => localStorage.getItem("sprint-scout.rider.v1"))).toBeNull();
  });
});

// The published export carries the policy as a meta tag; the dev server does
// not, so there this proves only that the journey itself is clean.
const policyTags = (project: string) => (project === "static-chromium" ? 1 : 0);

test("a full journey breaks no content security rule @smoke", async ({ page, planner, seed }) => {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { cspViolations: string[] }).cspViolations = seen;
    document.addEventListener("securitypolicyviolation", (event) =>
      seen.push(`${event.violatedDirective} ${event.blockedURI}`),
    );
  });

  await seed(seeded);
  await expect(planner.cockpit.windSummary).toBeVisible();
  await planner.terrain.load();

  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(
    policyTags(test.info().project.name),
  );
  expect(await page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations)).toEqual([]);
});
