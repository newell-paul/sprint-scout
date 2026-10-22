import { afterEach, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react/pure";
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
  availability: null,
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
