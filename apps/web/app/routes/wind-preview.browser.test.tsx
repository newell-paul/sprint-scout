import { afterEach, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react/pure";
import type { Locator } from "vitest/browser";
import type { Map as RouteMap } from "maplibre-gl";
import WindPreview from "./wind-preview";
import {
  aRoute,
  aria,
  openMeteo,
  resetOpenMeteo,
  rider,
  uniquePoints,
} from "../../test/fixtures";

afterEach(() => {
  resetOpenMeteo();
  vi.restoreAllMocks();
});

const console = { name: "Route wind forecast" };
const props = () => ({
  map: null,
  ready: false,
  unit: "km/h" as const,
  rider,
  riderInput: null,
  onRiderChange: vi.fn(),
  daylightDryOnly: false,
  onDaylightDryChange: vi.fn(),
  onTargetChange: vi.fn(() => true),
  onTerrainChange: vi.fn(() => true),
  onTerrainAutoChange: vi.fn(() => true),
  onShelterChange: vi.fn(() => true),
  onEffortsChange: vi.fn(() => true),
});
const fresh = () => aRoute({ points: uniquePoints() });

// Ends while still loading, so the teardown axe run checks the busy state.
it("loading: a busy placeholder while the forecast is outstanding", async () => {
  openMeteo.faults.weather = "timeout";
  const screen = await render(<WindPreview route={fresh()} {...props()} />);
  const region = screen.getByRole("region", console);
  await expect
    .element(region.getByTestId("forecast-placeholder"))
    .toHaveAttribute("aria-busy", "true");
  await expect
    .element(region.getByRole("group", { name: "Forecast navigation" }))
    .not.toBeInTheDocument();
});

it("ready: the console once the forecast lands", async () => {
  const screen = await render(<WindPreview route={fresh()} {...props()} />);
  const region = screen.getByRole("region", console);
  await expect
    .element(region.getByRole("group", { name: "Forecast navigation" }))
    .toBeVisible();
  await expect
    .element(
      region
        .getByRole("status")
        .filter({ hasText: /Forecast near segment start/ }),
    )
    .toBeVisible();
  await expect.element(region.getByText("Hour 1 of 48")).toBeInTheDocument();
  await expect
    .element(region.getByRole("region", { name: "Ride instruments" }))
    .toHaveAttribute("data-tone", "gain");
  await aria("wind-preview.ready", region);
});

it("navigation: next and previous hour move the selection", async () => {
  const screen = await render(<WindPreview route={fresh()} {...props()} />);
  const region = screen.getByRole("region", console);
  await expect
    .element(region.getByRole("button", { name: "Previous hour" }))
    .toBeDisabled();
  await region.getByRole("button", { name: "Next hour" }).click();
  await expect.element(region.getByText("Hour 2 of 48")).toBeInTheDocument();
  await region.getByRole("button", { name: "Tomorrow" }).click();
  await expect
    .element(region.getByRole("button", { name: "Tomorrow" }))
    .toHaveAttribute("aria-pressed", "true");
  await expect
    .element(region.getByRole("button", { name: "Best hour" }))
    .toBeEnabled();
});

it("opportunity: a repeated request for the same hour moves back to it", async () => {
  const route = fresh();
  const at = "2026-09-11T09:00:00.000Z";
  const screen = await render(
    <WindPreview route={route} requestedAt={at} requestSeq={1} {...props()} />,
  );
  const region = screen.getByRole("region", console);
  await expect.element(region.getByText("Hour 3 of 48")).toBeInTheDocument();
  await region.getByRole("button", { name: "Next hour" }).click();
  await expect.element(region.getByText("Hour 4 of 48")).toBeInTheDocument();

  await screen.rerender(
    <WindPreview route={route} requestedAt={at} requestSeq={2} {...props()} />,
  );

  await expect.element(region.getByText("Hour 3 of 48")).toBeInTheDocument();
});

it("navigation: previous hour steps back", async () => {
  const screen = await render(<WindPreview route={fresh()} {...props()} />);
  const region = screen.getByRole("region", console);
  await region.getByRole("button", { name: "Next hour" }).click();

  await region.getByRole("button", { name: "Previous hour" }).click();

  await expect
    .element(region.getByRole("slider", { name: "Forecast hour" }))
    .toHaveValue("0");
});

const tailwindTime = async (region: Locator) => {
  const time = region.getByTestId("segment-time-value");
  await expect.element(time).not.toHaveTextContent("Unavailable");
  return time.element().textContent!;
};

it("best hour: picks today's best window from tomorrow", async () => {
  openMeteo.wind = { speed: 5, direction: 180, gust: null };
  const screen = await render(<WindPreview route={fresh()} {...props()} />);
  const region = screen.getByRole("region", console);
  const best = await tailwindTime(region);
  await region.getByRole("button", { name: "Tomorrow" }).click();

  await region.getByRole("button", { name: "Best hour" }).click();

  await expect
    .element(region.getByRole("slider", { name: "Forecast hour" }))
    .toHaveValue("0");
  await expect
    .element(region.getByRole("button", { name: "Best hour" }))
    .toHaveAttribute("aria-pressed", "true");
  await expect
    .element(region.getByRole("button", { name: "Today" }))
    .toHaveAttribute("aria-pressed", "true");
  const window = region.getByTestId("selected-window");
  await expect.element(window).toHaveAttribute("data-best", "true");
  await expect.element(window).toHaveTextContent(best);
});

it("hourly table: picking a row selects that hour", async () => {
  openMeteo.hours = { 47: { direction: 270, code: 61 } };
  const screen = await render(<WindPreview route={fresh()} {...props()} />);
  const region = screen.getByRole("region", console);
  const first = await tailwindTime(region);
  const slider = region.getByRole("slider", { name: "Forecast hour" });
  await slider.fill("47");
  await expect
    .element(region.getByTestId("segment-time-value"))
    .not.toHaveTextContent(first);

  await region.getByText("Hourly times", { exact: true }).click();
  await region
    .getByRole("region", { name: "Hourly times table" })
    .getByRole("button")
    .first()
    .click();

  await expect.element(slider).toHaveValue("0");
  await expect
    .element(region.getByTestId("segment-time-value"))
    .toHaveTextContent(first);
});

it("wind missing: the selected hour reads unavailable", async () => {
  openMeteo.hours = { 0: { speed: null, direction: null } };
  const screen = await render(<WindPreview route={fresh()} {...props()} />);
  const region = screen.getByRole("region", console);
  await expect
    .element(region.getByText("Wind unavailable for this hour."))
    .toBeInTheDocument();
  await expect
    .element(region.getByText("Wind data is missing for this hour."))
    .toBeVisible();
  await aria("wind-preview.wind-missing", region);
});

it("calm: no direction, calm readouts", async () => {
  openMeteo.hours = { 0: { speed: 0 } };
  const screen = await render(<WindPreview route={fresh()} {...props()} />);
  const region = screen.getByRole("region", console);
  await expect
    .element(region.getByText("Calm — no wind direction."))
    .toBeInTheDocument();
  await expect
    .element(region.getByRole("region", { name: "Ride instruments" }))
    .toHaveAttribute("data-tone", "neutral");
});

it("wet night: conditions show rain and the dry daylight filter skips it", async () => {
  openMeteo.hours = {
    0: { precipitation: 2.4, probability: 80, code: 61, isDay: 0 },
  };
  const screen = await render(
    <WindPreview route={fresh()} {...props()} daylightDryOnly />,
  );
  const region = screen.getByRole("region", console);
  await expect
    .element(region.getByRole("region", { name: "Attempt conditions" }))
    .toHaveTextContent("2.4 mm · 80% chance");
  await expect
    .element(region.getByRole("button", { name: "Best hour" }))
    .toHaveAttribute("aria-pressed", "false");
  await region.getByRole("button", { name: "Best hour" }).click();
  await expect
    .element(region.getByText("Hour 1 of 48"))
    .not.toBeInTheDocument();
  await aria("wind-preview.wet-night", region);
});

it("conditions: sustained wind, gusts and precipitation for the hour", async () => {
  openMeteo.wind = { speed: 4, direction: 180, gust: 10 };
  const screen = await render(<WindPreview route={fresh()} {...props()} />);
  const region = screen.getByRole("region", console);
  await expect
    .element(region.getByTestId("segment-time-value"))
    .not.toHaveTextContent("Unavailable");
  const conditions = region.getByRole("region", { name: "Attempt conditions" });
  await expect.element(conditions).toHaveTextContent("14.4 km/h");
  await expect.element(conditions).toHaveTextContent("36.0 km/h");
  await expect.element(conditions).toHaveTextContent("0.0 mm · 20% chance");
});

it("conditions without data: unavailable, and so is the target comparison", async () => {
  openMeteo.hours = {
    3: { speed: null, gust: null, precipitation: null, probability: null },
  };
  const screen = await render(
    <WindPreview
      route={aRoute({ points: uniquePoints(), targetTimeS: 90 })}
      {...props()}
    />,
  );
  const region = screen.getByRole("region", console);

  await region.getByRole("slider", { name: "Forecast hour" }).fill("3");

  await expect
    .element(region.getByRole("region", { name: "Attempt conditions" }))
    .toHaveTextContent("Unavailable");
  await expect
    .element(region.getByTestId("target-comparison"))
    .toHaveTextContent("comparison unavailable");
});

it("mph: the conditions convert", async () => {
  openMeteo.wind = { speed: 4, direction: 180, gust: 10 };
  const route = fresh();
  const screen = await render(<WindPreview route={route} {...props()} />);
  const conditions = screen
    .getByRole("region", console)
    .getByRole("region", { name: "Attempt conditions" });
  await expect.element(conditions).toHaveTextContent("36.0 km/h");

  await screen.rerender(<WindPreview route={route} {...props()} unit="mph" />);

  await expect.element(conditions).toHaveTextContent("22.4 mph");
});

// Rain straight after the night, so each band is a single run with a known edge.
const nightThenRain = () => {
  openMeteo.hours = Object.fromEntries(
    Array.from({ length: 48 }, (_, i) => [
      i,
      i === 6
        ? { speed: 8, code: 61 }
        : i < 6
          ? { speed: 7, code: 1, isDay: 0 as const }
          : { code: 1 },
    ]),
  );
};

it("bands: night and wet hours are marked on the timeline", async () => {
  nightThenRain();
  const screen = await render(<WindPreview route={fresh()} {...props()} />);
  const region = screen.getByRole("region", console);
  const night = region.getByTestId("band-night");
  const wet = region.getByTestId("band-wet");
  await expect.element(night).toHaveAttribute("data-from", "0");
  await expect.element(night).toHaveAttribute("data-to", "5");
  await expect.element(wet).toHaveAttribute("data-from", "6");
  expect(night.all()).toHaveLength(1);
  expect(wet.all()).toHaveLength(1);
});

it("hourly table: rain and night are named", async () => {
  nightThenRain();
  const screen = await render(<WindPreview route={fresh()} {...props()} />);
  const region = screen.getByRole("region", console);

  await region.getByText("Hourly times", { exact: true }).click();

  const rows = region
    .getByRole("region", { name: "Hourly times table" })
    .getByRole("row");
  // Row 0 is the header.
  await expect
    .element(rows.nth(7).getByRole("cell").last())
    .toHaveTextContent(/^Rain$/);
  await expect
    .element(rows.nth(1).getByRole("cell").last())
    .toHaveTextContent("night");
});

it("shelter: a segment without a setting starts exposed", async () => {
  const screen = await render(<WindPreview route={fresh()} {...props()} />);
  await expect
    .element(
      screen
        .getByRole("group", { name: "Shelter level" })
        .getByRole("button", { name: "Exposed 0% wind reduction" }),
    )
    .toHaveAttribute("aria-pressed", "true");
});

it("error: an outage shows the reason and offers try again", async () => {
  openMeteo.faults.weather = "outage";
  const screen = await render(<WindPreview route={fresh()} {...props()} />);
  const region = screen.getByRole("region", console);
  await expect.element(region.getByRole("alert")).toBeVisible();
  await expect
    .element(region.getByRole("group", { name: "Forecast navigation" }))
    .not.toBeInTheDocument();
  await aria("wind-preview.error", region);
});

it("recovery: try again after an outage brings the console back", async () => {
  openMeteo.faults.weather = "outage";
  const screen = await render(<WindPreview route={fresh()} {...props()} />);
  const region = screen.getByRole("region", console);
  await expect.element(region.getByRole("alert")).toBeVisible();
  openMeteo.faults.weather = "ok";
  await region.getByRole("button", { name: "Try again" }).click();
  await expect
    .element(region.getByRole("group", { name: "Forecast navigation" }))
    .toBeVisible();
  await expect.element(region.getByRole("alert")).not.toBeInTheDocument();
});

// Timers are faked only across the 12 s request timeout, because
// expect.element polls on real ones.
const renderPastTimeout = async () => {
  openMeteo.faults.weather = "timeout";
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  const screen = await render(<WindPreview route={fresh()} {...props()} />);
  vi.advanceTimersByTime(12_500);
  vi.useFakeTimers({ toFake: ["Date"] });
  return screen.getByRole("region", console);
};

it("timeout: a forecast that never answers says it timed out", async () => {
  const region = await renderPastTimeout();

  await expect
    .element(region.getByRole("alert"))
    .toHaveTextContent("Forecast request timed out or was cancelled.");
});

it("timeout recovery: try again after a timeout brings the console back", async () => {
  const region = await renderPastTimeout();
  await expect.element(region.getByRole("alert")).toBeVisible();
  openMeteo.faults.weather = "ok";

  await region.getByRole("button", { name: "Try again" }).click();

  await expect
    .element(region.getByRole("slider", { name: "Forecast hour" }))
    .toBeVisible();
  await expect.element(region.getByRole("alert")).not.toBeInTheDocument();
});

it("rate limit: the alert names the limit and offers try again", async () => {
  openMeteo.faults.weather = "rateLimit";
  const screen = await render(<WindPreview route={fresh()} {...props()} />);
  const region = screen.getByRole("region", console);
  await expect
    .element(region.getByRole("alert"))
    .toHaveTextContent("Weather service rate limit reached. Try again later.");
  await expect
    .element(region.getByRole("button", { name: "Try again" }))
    .toBeVisible();
});

it("empty body: the forecast is reported and no timeline shows", async () => {
  openMeteo.faults.weather = "empty";
  const screen = await render(<WindPreview route={fresh()} {...props()} />);
  const region = screen.getByRole("region", console);
  await expect.element(region.getByRole("alert")).toBeVisible();
  await expect
    .element(region.getByRole("slider", { name: "Forecast hour" }))
    .not.toBeInTheDocument();
});

it("target during an outage: a typed time can still be saved", async () => {
  openMeteo.faults.weather = "outage";
  const route = fresh();
  const onTargetChange = vi.fn(() => true);
  const screen = await render(
    <WindPreview route={route} {...props()} onTargetChange={onTargetChange} />,
  );
  const region = screen.getByRole("region", console);
  await expect.element(region.getByRole("alert")).toBeVisible();

  await region.getByLabelText("Target time (minutes:seconds)").fill("1:45");
  await region.getByRole("button", { name: "Save target" }).click();
  await screen.rerender(
    <WindPreview
      route={{ ...route, targetTimeS: 105 }}
      {...props()}
      onTargetChange={onTargetChange}
    />,
  );

  expect(onTargetChange).toHaveBeenCalledWith(105);
  await expect
    .element(region.getByRole("heading", { name: "Segment target · 1m 45s" }))
    .toBeVisible();
});

it("target: a time typed before the forecast lands is kept when it arrives", async () => {
  openMeteo.faults.weather = "outage";
  const screen = await render(<WindPreview route={fresh()} {...props()} />);
  const region = screen.getByRole("region", console);
  await expect.element(region.getByRole("alert")).toBeVisible();
  const field = region.getByLabelText("Target time (minutes:seconds)");
  await field.fill("1:30");
  openMeteo.faults.weather = "ok";
  await region.getByRole("button", { name: "Try again" }).click();
  await expect
    .element(region.getByRole("group", { name: "Forecast navigation" }))
    .toBeVisible();
  await expect.element(field).toHaveValue("1:30");
});

it("terrain mode without elevation: cockpit unavailable, panel offers fallback", async () => {
  const screen = await render(
    <WindPreview
      route={aRoute({ points: uniquePoints(), terrainMode: "terrain" })}
      {...props()}
    />,
  );
  const region = screen.getByRole("region", console);
  await expect
    .element(region.getByText(/Terrain is not loaded for this segment/))
    .toBeVisible();
  await expect
    .element(region.getByRole("button", { name: "Use flat-road estimate" }))
    .toBeVisible();
});

// Only getContainer is used once the map is ready; MapLibre itself is covered by e2e.
const readyMap = () => {
  const container = document.createElement("div");
  document.body.append(container);
  return {
    map: { getContainer: () => container } as unknown as RouteMap,
    ready: true,
  };
};
const prefersReducedMotion = (reduce: boolean) => {
  const original = window.matchMedia.bind(window);
  vi.spyOn(window, "matchMedia").mockImplementation((query) =>
    query === "(prefers-reduced-motion: reduce)"
      ? ({ ...original(query), matches: reduce } as MediaQueryList)
      : original(query),
  );
};

it("reduced motion: the particle field is drawn static", async () => {
  prefersReducedMotion(true);

  const screen = await render(
    <WindPreview route={fresh()} {...props()} {...readyMap()} />,
  );

  await expect
    .element(screen.getByTestId("wind-particle-field"))
    .toHaveAttribute("data-motion", "static");
});

it("full motion: the particle field animates", async () => {
  prefersReducedMotion(false);

  const screen = await render(
    <WindPreview route={fresh()} {...props()} {...readyMap()} />,
  );

  await expect
    .element(screen.getByTestId("wind-particle-field"))
    .toHaveAttribute("data-motion", "animated");
});

it("wind missing on the next hour: cockpit and map overlay go blank", async () => {
  openMeteo.hours = { 1: { speed: null } };
  const screen = await render(
    <WindPreview route={fresh()} {...props()} {...readyMap()} />,
  );
  const region = screen.getByRole("region", console);
  await expect.element(screen.getByTestId("wind-map-overlay")).toBeVisible();

  await region.getByRole("button", { name: "Next hour" }).click();

  await expect
    .element(region.getByRole("slider", { name: "Forecast hour" }))
    .toHaveValue("1");
  await expect
    .element(region.getByTestId("segment-time-value"))
    .toHaveTextContent("Unavailable");
  await expect
    .element(region.getByTestId("wind-summary"))
    .toHaveTextContent("Wind unavailable");
  await expect
    .element(region.getByTestId("cockpit-speed"))
    .toHaveTextContent("Unavailable");
  expect(
    region.getByTestId("ride-cockpit").element().querySelector(".dial-needle"),
  ).toBeNull();
  await expect
    .element(screen.getByTestId("wind-map-overlay"))
    .not.toBeInTheDocument();
});

it("particles off: the field goes and the wind arrow stays", async () => {
  const screen = await render(
    <WindPreview route={fresh()} {...props()} {...readyMap()} />,
  );
  await expect
    .element(screen.getByTestId("wind-particle-field"))
    .toBeInTheDocument();

  await screen.getByRole("button", { name: "Wind particles on" }).click();

  await expect
    .element(screen.getByTestId("wind-particle-field"))
    .not.toBeInTheDocument();
  await expect
    .element(screen.getByTestId("wind-map-overlay").getByText("↑"))
    .toBeVisible();
});

it("particles back on: the field is restored", async () => {
  const screen = await render(
    <WindPreview route={fresh()} {...props()} {...readyMap()} />,
  );
  await screen.getByRole("button", { name: "Wind particles on" }).click();
  await expect
    .element(screen.getByTestId("wind-particle-field"))
    .not.toBeInTheDocument();

  await screen.getByRole("button", { name: "Wind particles off" }).click();

  await expect
    .element(screen.getByTestId("wind-particle-field"))
    .toBeInTheDocument();
});
