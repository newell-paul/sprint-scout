import { aRoute, expect, test } from "./fixtures";

test.use({ fixedTime: "2026-09-10T07:00:00Z" });
const northbound = aRoute({ id: "north", name: "Northbound", slot: 0 });
const southbound = aRoute({
  id: "south",
  name: "Southbound",
  slot: 1,
  points: [
    [-0.2, 51.51],
    [-0.2, 51.5],
  ],
});
const both = { routes: [northbound, southbound] };

test.beforeEach(({ openMeteo }) => {
  openMeteo.wind = { speed: 4, direction: 180, gust: null };
  openMeteo.hours = Object.fromEntries(
    Array.from({ length: 48 }, (_, i) => [
      i,
      i === 6 ? { speed: 8, code: 61 } : i < 6 ? { speed: 7, code: 1, isDay: 0 as const } : { code: 1 },
    ]),
  );
});

test("ranking fetches one forecast per segment and puts the gain first @smoke @a11y", async ({
  planner,
  seed,
  openMeteo,
  aria,
}) => {
  await seed(both);
  await expect.poll(() => openMeteo.weatherLongitudes).toEqual(["-0.12"]);

  await planner.board.rank();

  const { board } = planner;
  const [first, second] = [board.rows.first(), board.rows.nth(1)];
  await expect(board.rows).toHaveCount(2);
  await expect(first).toHaveAttribute("data-status", "ranked");
  await expect(second).toHaveAttribute("data-status", "ranked");
  await expect(first).toContainText("Northbound");
  await expect(board.gain(first)).toHaveAttribute("data-tone", "gain");
  await expect(second).toContainText("Southbound");
  await expect(board.gain(second)).toHaveAttribute("data-tone", "loss");
  expect(openMeteo.weatherLongitudes).toEqual(["-0.12", "-0.2"]);
  await aria("board-ranked", board.region);
});

test("open jumps to that segment's best hour without a new request", async ({ planner, seed, openMeteo }) => {
  await seed(both);
  await planner.timeline.onlyDryDaylight();
  await planner.board.rank();

  await planner.board.open("Southbound");

  await expect(planner.library.slot(2)).toHaveAttribute("aria-pressed", "true");
  await expect(planner.timeline.slider).toHaveValue("7");
  await expect(planner.cockpit.region).toHaveAttribute("data-tone", "loss");
  expect(openMeteo.weatherLongitudes).toEqual(["-0.12", "-0.2"]);
});

test("refresh asks every segment again", async ({ planner, seed, openMeteo }) => {
  await seed(both);
  await planner.board.rank();
  await expect(planner.board.rows).toHaveCount(2);
  await expect(planner.board.refreshButton).toBeEnabled();

  await planner.board.refresh();

  await expect(planner.board.refreshButton).toBeEnabled();
  expect(openMeteo.calls.weather).toBe(4);
});

test("a segment whose forecast fails stays unranked with the reason", async ({ planner, seed, openMeteo }) => {
  await seed(both);
  openMeteo.faults.weather = "outage";

  await planner.board.rank();

  const { board } = planner;
  await expect(board.rows).toHaveCount(2);
  await expect(board.row("Southbound")).toHaveAttribute("data-status", "unavailable");
  await expect(board.openButton(board.row("Southbound"))).toBeDisabled();
});

test("the board is fine on a phone @mobile-only @mobile", async ({ planner, seed }) => {
  await seed(both);

  await planner.board.rank();

  await expect(planner.board.rows).toHaveCount(2);
  expect(await planner.horizontalOverflow()).toBe(0);
});
