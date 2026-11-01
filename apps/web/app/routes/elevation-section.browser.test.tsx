import { expect, it } from "vitest";
import { render } from "vitest-browser-react/pure";
import ElevationSection from "./elevation-section";
import type { Point } from "./library";
import { aria } from "../../test/fixtures";

const north = (n: number): Point[] =>
  Array.from({ length: n }, (_, i) => [-0.12, 51.5 + i * 0.001]);
const region = { name: "Segment elevation" };

it("metres: a falling segment with its start, finish and range", async () => {
  const screen = await render(
    <ElevationSection
      points={north(4)}
      heightsM={[14.4, 10.1, 13, 12.4]}
      unit="km/h"
    />,
  );
  const section = screen.getByRole("region", region);
  await expect
    .element(section)
    .toHaveTextContent("Start 14.4 m · Finish 12.4 m · Falls 2.0 m");
  await expect
    .element(section.getByRole("img"))
    .toHaveAccessibleName(
      "Elevation profile: start 14.4 m, finish 12.4 m, lowest 10.1 m, highest 14.4 m",
    );
  await aria("elevation-section.metres-falling", section);
});

it("feet: a rising segment, the net change matching the shown heights", async () => {
  const screen = await render(
    <ElevationSection points={north(2)} heightsM={[12.4, 14.4]} unit="mph" />,
  );
  const section = screen.getByRole("region", region);
  await expect
    .element(section)
    .toHaveTextContent("Start 41 ft · Finish 47 ft · Rises 6 ft");
  await aria("elevation-section.feet-rising", section);
});

it("level: start and finish at the same shown height", async () => {
  const screen = await render(
    <ElevationSection
      points={north(3)}
      heightsM={[20, 21.5, 20]}
      unit="km/h"
    />,
  );
  const section = screen.getByRole("region", region);
  await expect
    .element(section)
    .toHaveTextContent("Start 20.0 m · Finish 20.0 m · Level");
  await aria("elevation-section.level", section);
});
