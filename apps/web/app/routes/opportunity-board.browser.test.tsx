import { afterEach, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react/pure";
import OpportunityBoard from "./opportunity-board";
import {
  aRoute,
  aTerrain,
  aria,
  openMeteo,
  resetOpenMeteo,
  rider,
  uniquePoints,
} from "../../test/fixtures";

afterEach(resetOpenMeteo);

const board = { name: "Opportunity board", exact: true };
const routes = () => [
  aRoute({ id: "hill", name: "Test hill", slot: 0, points: uniquePoints() }),
  aRoute({
    id: "flat",
    name: "River flat",
    slot: 1,
    points: uniquePoints(),
    shelter: "dense",
    targetTimeS: 90,
  }),
];
const props = () => ({
  rider,
  daylightDryOnly: false,
  activeSlot: 0,
  onOpen: vi.fn(),
});

it("empty: ranking is disabled without segments", async () => {
  const screen = await render(<OpportunityBoard routes={[]} {...props()} />);
  const region = screen.getByRole("region", board);
  await expect
    .element(region.getByRole("button", { name: "Rank my segments" }))
    .toBeDisabled();
  await expect.element(region.getByRole("table")).not.toBeInTheDocument();
  await aria("opportunity-board.empty", region);
});

it("idle: explains what ranking shares before anything is sent", async () => {
  const screen = await render(
    <OpportunityBoard routes={routes()} {...props()} />,
  );
  const region = screen.getByRole("region", board);
  await expect
    .element(region.getByText(/Shares each saved segment’s start location/))
    .toBeVisible();
  await expect
    .element(region.getByRole("button", { name: "Rank my segments" }))
    .toBeEnabled();
  await aria("opportunity-board.idle", region);
});

it("ranked: every segment at its best hour, active slot marked", async () => {
  const screen = await render(
    <OpportunityBoard routes={routes()} {...props()} />,
  );
  const region = screen.getByRole("region", board);
  await region.getByRole("button", { name: "Rank my segments" }).click();
  await expect
    .element(region.getByRole("status"))
    .toHaveTextContent(/Same rider, model and forecast source/);
  const rows = region.getByTestId("board-row");
  await expect.poll(() => rows.elements().length).toBe(2);
  await expect
    .element(region.getByRole("row", { name: /Test hill/ }))
    .toHaveAttribute("aria-current", "true");
  await expect
    .element(region.getByRole("row", { name: /River flat/ }))
    .toHaveTextContent("Dense · assumed shelter");
  await expect
    .element(region.getByRole("button", { name: "Refresh" }))
    .toBeEnabled();
  await aria("opportunity-board.ranked", region);
});

it("terrain: a segment with terrain ranks with the terrain model", async () => {
  const points = uniquePoints();
  const route = aRoute({
    points,
    terrain: aTerrain(points),
    terrainMode: "terrain",
  });
  const screen = await render(
    <OpportunityBoard routes={[route]} {...props()} />,
  );
  const region = screen.getByRole("region", board);
  await region.getByRole("button", { name: "Rank my segments" }).click();
  const row = region.getByRole("row", { name: /Test hill/ });
  await expect.element(row).toHaveAttribute("data-status", "ranked");
  await expect.element(row).toHaveTextContent("Terrain-aware");
});

it("filters: the heading names the dry daylight filter", async () => {
  const screen = await render(
    <OpportunityBoard routes={routes()} {...props()} daylightDryOnly />,
  );
  const region = screen.getByRole("region", board);
  await expect
    .element(region.getByText(/next 48 hours · dry daylight only$/))
    .toBeVisible();
});

it("open: hands the slot and best hour back", async () => {
  const onOpen = vi.fn();
  const screen = await render(
    <OpportunityBoard routes={routes()} {...props()} onOpen={onOpen} />,
  );
  const region = screen.getByRole("region", board);
  await region.getByRole("button", { name: "Rank my segments" }).click();
  await region
    .getByRole("row", { name: /River flat/ })
    .getByRole("button", { name: "Open" })
    .click();
  expect(onOpen).toHaveBeenCalledTimes(1);
  const [slot, at] = onOpen.mock.calls[0]!;
  expect(slot).toBe(1);
  expect(Number.isFinite(Date.parse(at))).toBe(true);
});

it("error: a forecast outage leaves segments unranked with a reason", async () => {
  openMeteo.faults.weather = "outage";
  const screen = await render(
    <OpportunityBoard routes={routes()} {...props()} />,
  );
  const region = screen.getByRole("region", board);
  await region.getByRole("button", { name: "Rank my segments" }).click();
  await expect
    .element(region.getByRole("status"))
    .toHaveTextContent(/Same rider, model and forecast source/);
  const rows = region.getByTestId("board-row");
  await expect.poll(() => rows.elements().length).toBe(2);
  await expect
    .element(region.getByRole("row", { name: /Test hill/ }))
    .toHaveAttribute("data-status", "unavailable");
  await expect
    .element(
      region
        .getByRole("row", { name: /Test hill/ })
        .getByRole("button", { name: "Open" }),
    )
    .toBeDisabled();
  await aria("opportunity-board.error", region);
});

it("refresh: a later settings save neither refetches nor bypasses the cache", async () => {
  const fetchSpy = vi.spyOn(window, "fetch");
  const forecasts = () =>
    fetchSpy.mock.calls.filter(([url]) => String(url).includes("/v1/forecast"))
      .length;
  const initial = routes();
  const screen = await render(
    <OpportunityBoard routes={initial} {...props()} />,
  );
  const region = screen.getByRole("region", board);
  await region.getByRole("button", { name: "Rank my segments" }).click();
  await region.getByRole("button", { name: "Refresh" }).click();
  await expect
    .poll(() => region.getByTestId("board-row").elements().length)
    .toBe(2);
  const before = forecasts();

  await screen.rerender(
    <OpportunityBoard
      routes={initial.map((route) => ({ ...route, targetTimeS: 120 }))}
      {...props()}
    />,
  );

  await expect
    .element(region.getByRole("row", { name: /Test hill/ }))
    .toBeVisible();
  expect(forecasts()).toBe(before);
  fetchSpy.mockRestore();
});
