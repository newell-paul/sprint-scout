import { afterEach, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react/pure";
import type { TerrainProfile } from "@scout/application/terrain";
import TerrainPanel from "./terrain-panel";
import {
  aRoute,
  aTerrain,
  aria,
  openMeteo,
  resetOpenMeteo,
} from "../../test/fixtures";

afterEach(resetOpenMeteo);

const panel = { name: "Segment terrain" };
const handlers = () => ({
  onChange: vi.fn<
    (terrain: TerrainProfile | null, mode: "flat" | "terrain") => boolean
  >(() => true),
  onAutoChange: vi.fn<(auto: boolean) => boolean>(() => true),
});

it("empty: flat-road mode, nothing loaded, load needs consent", async () => {
  const screen = await render(
    <TerrainPanel route={aRoute()} unit="km/h" {...handlers()} />,
  );
  const region = screen.getByRole("region", panel);
  await expect
    .element(region.getByRole("heading", { level: 3 }))
    .toHaveTextContent("Terrain · Flat-road mode");
  await expect
    .element(region.getByRole("button", { name: "Load terrain" }))
    .toBeDisabled();
  await expect
    .element(region.getByText(/No usable elevation loaded/))
    .toBeVisible();
  await expect
    .element(
      region.getByRole("checkbox", { name: /Reload terrain automatically/ }),
    )
    .toBeDisabled();
  await aria("terrain-panel.empty", region);
});

it("terrain mode without elevation: offers the flat-road fallback", async () => {
  const { onChange, onAutoChange } = handlers();
  const screen = await render(
    <TerrainPanel
      route={aRoute({ terrainMode: "terrain" })}
      unit="km/h"
      onChange={onChange}
      onAutoChange={onAutoChange}
    />,
  );
  const region = screen.getByRole("region", panel);
  await expect
    .element(region.getByRole("heading", { level: 3 }))
    .toHaveTextContent("Terrain · Enabled");
  await region.getByRole("button", { name: "Use flat-road estimate" }).click();
  expect(onChange).toHaveBeenCalledWith(null, "flat");
  await aria("terrain-panel.terrain-missing", region);
});

it("ready: profile, stats and the model switch", async () => {
  const route = aRoute({ terrain: aTerrain(), terrainMode: "terrain" });
  const screen = await render(
    <TerrainPanel route={route} unit="km/h" {...handlers()} />,
  );
  const region = screen.getByRole("region", panel);
  await expect
    .element(region.getByRole("img", { name: /Smoothed elevation profile/ }))
    .toBeVisible();
  await expect
    .element(region.getByRole("button", { name: "Terrain", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await expect
    .element(region.getByRole("button", { name: "Reload terrain" }))
    .toBeDisabled();
  await expect.element(region.getByText(/^Length 1\.11 km/)).toBeVisible();
  await aria("terrain-panel.ready", region);
});

it("mph: lengths in miles and heights in feet", async () => {
  const route = aRoute({ terrain: aTerrain(), terrainMode: "terrain" });
  const screen = await render(
    <TerrainPanel route={route} unit="mph" {...handlers()} />,
  );
  const region = screen.getByRole("region", panel);
  await expect.element(region.getByText(/^Length 0\.69 mi/)).toBeVisible();
  await expect.element(region.getByText(/^Start \d+ ft$/)).toBeVisible();
});

// Ends while still loading, so the teardown axe run checks the busy state.
it("loading: the load button is busy and disabled while elevation is outstanding", async () => {
  openMeteo.faults.elevation = "timeout";
  const { onChange, onAutoChange } = handlers();
  const screen = await render(
    <TerrainPanel
      route={aRoute()}
      unit="km/h"
      onChange={onChange}
      onAutoChange={onAutoChange}
    />,
  );
  const region = screen.getByRole("region", panel);
  await region
    .getByRole("checkbox", { name: /Share sampled coordinates/ })
    .click();
  await region.getByRole("button", { name: "Load terrain" }).click();
  await expect
    .element(region.getByRole("button", { name: "Loading elevation…" }))
    .toBeDisabled();
  expect(onChange).not.toHaveBeenCalled();
});

it("loaded: consent enables load, the response is saved", async () => {
  const { onChange, onAutoChange } = handlers();
  const screen = await render(
    <TerrainPanel
      route={aRoute()}
      unit="km/h"
      onChange={onChange}
      onAutoChange={onAutoChange}
    />,
  );
  const region = screen.getByRole("region", panel);
  await region
    .getByRole("checkbox", { name: /Share sampled coordinates/ })
    .click();
  const load = region.getByRole("button", { name: "Load terrain" });
  await expect.element(load).toBeEnabled();
  await load.click();
  await expect
    .element(region.getByRole("status"))
    .toHaveTextContent("Terrain loaded and saved in this browser.");
  expect(onChange).toHaveBeenCalledTimes(1);
  const [profile, mode] = onChange.mock.calls[0]!;
  expect(mode).toBe("terrain");
  expect(profile?.elevationsM.length).toBe(aTerrain().elevationsM.length);
});

it("error: an elevation outage leaves the previous model alone", async () => {
  openMeteo.faults.elevation = "outage";
  const { onChange, onAutoChange } = handlers();
  const screen = await render(
    <TerrainPanel
      route={aRoute()}
      unit="km/h"
      onChange={onChange}
      onAutoChange={onAutoChange}
    />,
  );
  const region = screen.getByRole("region", panel);
  await region
    .getByRole("checkbox", { name: /Share sampled coordinates/ })
    .click();
  await region.getByRole("button", { name: "Load terrain" }).click();
  await expect.element(region.getByRole("status")).not.toHaveTextContent("");
  expect(onChange).not.toHaveBeenCalled();
  await expect
    .element(region.getByRole("heading", { level: 3 }))
    .toHaveTextContent("Terrain · Flat-road mode");
  await aria("terrain-panel.error", region);
});

it("incomplete: a missing elevation sample is reported and nothing is saved", async () => {
  openMeteo.faults.elevation = "incomplete";
  const { onChange, onAutoChange } = handlers();
  const screen = await render(
    <TerrainPanel
      route={aRoute()}
      unit="km/h"
      onChange={onChange}
      onAutoChange={onAutoChange}
    />,
  );
  const region = screen.getByRole("region", panel);
  await region
    .getByRole("checkbox", { name: /Share sampled coordinates/ })
    .click();
  await region.getByRole("button", { name: "Load terrain" }).click();
  await expect
    .element(region.getByRole("status"))
    .toHaveTextContent("Elevation is incomplete or invalid");
  expect(onChange).not.toHaveBeenCalled();
  await expect.element(region.getByRole("img")).not.toBeInTheDocument();
});

it("save refused: says the segment may have changed", async () => {
  const screen = await render(
    <TerrainPanel
      route={aRoute()}
      unit="km/h"
      onChange={() => false}
      onAutoChange={() => true}
    />,
  );
  const region = screen.getByRole("region", panel);
  await region
    .getByRole("checkbox", { name: /Share sampled coordinates/ })
    .click();
  await region.getByRole("button", { name: "Load terrain" }).click();
  await expect
    .element(region.getByRole("status"))
    .toHaveTextContent(/Could not save terrain/);
});

it("remove elevation: clears the profile and returns to flat road", async () => {
  const { onChange, onAutoChange } = handlers();
  const route = aRoute({ terrain: aTerrain(), terrainMode: "terrain" });
  const screen = await render(
    <TerrainPanel
      route={route}
      unit="km/h"
      onChange={onChange}
      onAutoChange={onAutoChange}
    />,
  );
  const region = screen.getByRole("region", panel);
  await region.getByRole("button", { name: "Remove elevation" }).click();
  expect(onChange).toHaveBeenCalledWith(null, "flat");
  await expect
    .element(region.getByRole("status"))
    .toHaveTextContent("Elevation removed; flat-road mode selected.");
});

it("remove elevation: switches automatic reload off", async () => {
  const { onChange, onAutoChange } = handlers();
  const route = aRoute({
    terrain: aTerrain(),
    terrainMode: "terrain",
    terrainAuto: true,
  });
  const screen = await render(
    <TerrainPanel
      route={route}
      unit="km/h"
      onChange={onChange}
      onAutoChange={onAutoChange}
    />,
  );
  const region = screen.getByRole("region", panel);
  await expect
    .element(
      region.getByRole("checkbox", { name: /Reload terrain automatically/ }),
    )
    .toBeChecked();
  await region.getByRole("button", { name: "Remove elevation" }).click();
  expect(onAutoChange).toHaveBeenCalledExactlyOnceWith(false);
});
