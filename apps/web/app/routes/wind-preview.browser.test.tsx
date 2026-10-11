import { afterEach, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react/pure";
import WindPreview from "./wind-preview";
import {
  aRoute,
  aria,
  openMeteo,
  resetOpenMeteo,
  rider,
  uniquePoints,
} from "../../test/fixtures";

afterEach(resetOpenMeteo);

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

it("loading: a busy placeholder until the forecast lands, then the console", async () => {
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

it("error: an outage shows the reason and try again recovers", async () => {
  openMeteo.faults.weather = "outage";
  const screen = await render(<WindPreview route={fresh()} {...props()} />);
  const region = screen.getByRole("region", console);
  await expect.element(region.getByRole("alert")).toBeVisible();
  await expect
    .element(region.getByRole("group", { name: "Forecast navigation" }))
    .not.toBeInTheDocument();
  await aria("wind-preview.error", region);
  openMeteo.faults.weather = "ok";
  await region.getByRole("button", { name: "Try again" }).click();
  await expect
    .element(region.getByRole("group", { name: "Forecast navigation" }))
    .toBeVisible();
  await expect.element(region.getByRole("alert")).not.toBeInTheDocument();
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
