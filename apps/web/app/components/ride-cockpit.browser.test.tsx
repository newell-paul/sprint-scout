import { expect, it } from "vitest";
import { render } from "vitest-browser-react/pure";
import { describeRouteWind } from "@scout/application/route-wind";
import RideCockpit from "./ride-cockpit";
import { formatSpeed } from "./speed";
import { formatDuration, formatTimeDifference } from "./time";
import {
  aRoute,
  aTerrain,
  anEffect,
  anHour,
  aria,
  northbound,
} from "../../test/fixtures";

const instruments = { name: "Ride instruments" };
const describe = (hour = anHour()) => describeRouteWind(northbound, hour);

it("ready: a tailwind hour reads faster than still air", async () => {
  const hour = anHour();
  const effect = anEffect(hour)!;
  const screen = await render(
    <RideCockpit
      effect={effect}
      hour={hour}
      unit="km/h"
      description={describe(hour)}
    />,
  );
  const region = screen.getByRole("region", instruments);
  await expect.element(region).toHaveAttribute("data-tone", "gain");
  await expect
    .element(region.getByText(formatSpeed(effect.windSpeedMps)))
    .toBeVisible();
  await expect
    .element(region.getByText(formatTimeDifference(effect.timeDeltaS)))
    .toBeVisible();
  await expect.element(region.getByText("Towards N")).toBeVisible();
  await aria("ride-cockpit.ready", region);
});

it("headwind: a northerly on a northbound segment is a loss", async () => {
  const hour = anHour({ fromDegrees: 0, flowDegrees: 180 });
  const effect = anEffect(hour)!;
  const screen = await render(
    <RideCockpit
      effect={effect}
      hour={hour}
      unit="km/h"
      description={describe(hour)}
    />,
  );
  const region = screen.getByRole("region", instruments);
  await expect.element(region).toHaveAttribute("data-tone", "loss");
  expect(effect.timeDeltaS).toBeGreaterThan(0);
  await expect.element(region.getByText("Towards S")).toBeVisible();
});

it("calm: no direction and a neutral tone", async () => {
  const hour = anHour({ speedMps: 0, flowDegrees: null, fromDegrees: null });
  const screen = await render(
    <RideCockpit
      effect={anEffect(hour)}
      hour={hour}
      unit="km/h"
      description={describe(hour)}
    />,
  );
  const region = screen.getByRole("region", instruments);
  await expect.element(region).toHaveAttribute("data-tone", "neutral");
  await expect
    .element(region.getByText("Calm", { exact: true }).first())
    .toBeVisible();
  await expect.element(region.getByText("No wind direction")).toBeVisible();
  await aria("ride-cockpit.calm", region);
});

it("calm: the estimate matches the still-air time", async () => {
  const hour = anHour({ speedMps: 0, gustMps: 0 });
  const effect = anEffect(hour)!;
  const screen = await render(
    <RideCockpit
      effect={effect}
      hour={hour}
      unit="km/h"
      description={describe(hour)}
    />,
  );
  const region = screen.getByRole("region", instruments);
  await expect
    .element(region.getByText(/^Same time as still air/))
    .toBeVisible();
  await expect
    .element(region.getByRole("definition").first())
    .toHaveTextContent(formatDuration(effect.windTimeS));
  await expect
    .element(region.getByText("Calm", { exact: true }).first())
    .toBeVisible();
});

it("wind missing: every instrument reads unavailable with the reason", async () => {
  const hour = anHour({ speedMps: null, fromDegrees: null, flowDegrees: null });
  const screen = await render(
    <RideCockpit
      effect={null}
      hour={hour}
      unit="km/h"
      description={describe(hour)}
    />,
  );
  const region = screen.getByRole("region", instruments);
  await expect
    .element(region.getByText("Wind data is missing for this hour."))
    .toBeVisible();
  await expect
    .poll(() => region.getByText("Unavailable").elements().length)
    .toBe(3);
  await aria("ride-cockpit.wind-missing", region);
});

it("terrain missing: points at the terrain panel", async () => {
  const hour = anHour();
  const screen = await render(
    <RideCockpit
      effect={null}
      hour={hour}
      unit="km/h"
      description={describe(hour)}
      terrainMode
      terrainMissing
    />,
  );
  const region = screen.getByRole("region", instruments);
  await expect
    .element(region.getByText(/Terrain is not loaded for this segment/))
    .toBeVisible();
  await expect
    .element(
      region.getByText(
        "Modelled at constant effort · Terrain-aware · Unvalidated",
      ),
    )
    .toBeVisible();
  await aria("ride-cockpit.terrain-missing", region);
});

it("terrain: still-air baseline is on the same terrain", async () => {
  const hour = anHour();
  const route = aRoute({ terrain: aTerrain(), terrainMode: "terrain" });
  const effect = anEffect(hour, route)!;
  const screen = await render(
    <RideCockpit
      effect={effect}
      hour={hour}
      unit="km/h"
      description={describe(hour)}
      terrainMode
    />,
  );
  const region = screen.getByRole("region", instruments);
  await expect
    .element(region.getByText("Still air · same terrain"))
    .toBeVisible();
  await expect
    .element(region.getByText(formatDuration(effect.calmTimeS)))
    .toBeVisible();
});

it("sheltered: names the assumption and the exposed comparison", async () => {
  const hour = anHour();
  const effect = anEffect(hour, aRoute({ shelter: "dense" }))!;
  const screen = await render(
    <RideCockpit
      effect={effect}
      hour={hour}
      unit="km/h"
      description={describe(hour)}
    />,
  );
  const region = screen.getByRole("region", instruments);
  await expect
    .element(region.getByText("Dense · assumed shelter"))
    .toBeVisible();
  await expect
    .element(region.getByText(formatDuration(effect.exposedTimeS!)))
    .toBeVisible();
  await aria("ride-cockpit.sheltered", region);
});

it("target: compares the estimate with the goal", async () => {
  const hour = anHour();
  const screen = await render(
    <RideCockpit
      effect={anEffect(hour)}
      hour={hour}
      unit="km/h"
      description={describe(hour)}
      targetTimeS={90}
    />,
  );
  const region = screen.getByRole("region", instruments);
  await expect.element(region.getByText("Target 1m 30s")).toBeVisible();
  await expect
    .element(region.getByText(/not a success probability/))
    .toBeVisible();
  await aria("ride-cockpit.target", region);
});

it("mph: readouts follow the unit", async () => {
  const hour = anHour();
  const effect = anEffect(hour)!;
  const screen = await render(
    <RideCockpit
      effect={effect}
      hour={hour}
      unit="mph"
      description={describe(hour)}
    />,
  );
  const region = screen.getByRole("region", instruments);
  await expect
    .element(region.getByText(formatSpeed(effect.windSpeedMps, "mph")))
    .toBeVisible();
  await expect.element(region.getByText(/\d\.\d\d mi$/)).toBeVisible();
});
