import { aRoute, expect, test } from "./fixtures";

test.beforeEach(({ openMeteo }) => {
  openMeteo.wind = { speed: 5, direction: 180, gust: 10 };
});

const twoSprints = {
  routes: [0, 1].map((slot) =>
    aRoute({ id: `sprint-${slot}`, name: `Sprint ${slot + 1}`, slot }),
  ),
};
const denseSprint = {
  routes: [aRoute({ id: "sprint-0", name: "Sprint 1", shelter: "dense" })],
};

test("a segment starts exposed", async ({ planner, seed }) => {
  await seed(twoSprints);

  await expect(planner.shelter.preset("exposed")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("dense shelter shortens the tailwind benefit and leaves the weather alone", async ({
  planner,
  seed,
}) => {
  await seed(twoSprints);
  await expect(planner.cockpit.segmentTime).not.toHaveText("Unavailable");
  const before = await planner.cockpit.time();
  const weather = await planner.attempt.conditions.innerText();

  await planner.shelter.choose("dense");

  const { cockpit } = planner;
  await expect(cockpit.segmentTime).not.toHaveText(before);
  await expect(cockpit.region).toContainText("Exposed comparison");
  await expect(cockpit.region).toContainText(before);
  await expect(planner.shelter.assumption).toHaveText(
    "Dense · assumed shelter",
  );
  await expect(planner.attempt.conditions).toHaveText(weather, {
    useInnerText: true,
  });
});

test("shelter is per segment", async ({ planner, seed }) => {
  await seed(twoSprints);
  await planner.shelter.choose("dense");

  await planner.library.selectSlot(2);

  await expect(planner.shelter.preset("exposed")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("shelter persists across reload", async ({ planner, seed, openMeteo }) => {
  await seed(twoSprints);
  await planner.shelter.choose("dense");
  await expect(planner.shelter.assumption).toBeVisible();
  const after = await planner.cockpit.time();

  await planner.reload();

  await expect(planner.shelter.preset("dense")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(planner.cockpit.segmentTime).toHaveText(after);
  expect(openMeteo.calls.weather).toBe(2);
});

test("the board carries the shelter assumption", async ({ planner, seed }) => {
  await seed(denseSprint);

  await planner.board.rank();

  await expect(planner.board.row("Sprint 1")).toContainText(
    "Dense · assumed shelter",
  );
});

test("opening from the board gives the same sheltered estimate", async ({
  planner,
  seed,
  openMeteo,
}) => {
  await seed(denseSprint);
  await expect(planner.cockpit.segmentTime).not.toHaveText("Unavailable");
  const after = await planner.cockpit.time();
  await planner.board.rank();

  await planner.board.open("Sprint 1");

  await expect(planner.cockpit.segmentTime).toHaveText(after);
  expect(openMeteo.calls.weather).toBe(1);
});

test("a preset can be chosen with the keyboard @keyboard", async ({
  planner,
  seed,
}) => {
  await seed(twoSprints);

  await planner.shelter.chooseWithKeyboard("sheltered");

  await expect(planner.shelter.assumption).toHaveText(
    "Sheltered · assumed shelter",
  );
});

test("back to exposed restores the original estimate", async ({
  planner,
  seed,
}) => {
  await seed(twoSprints);
  await expect(planner.cockpit.segmentTime).not.toHaveText("Unavailable");
  const before = await planner.cockpit.time();
  await planner.shelter.choose("dense");
  await expect(planner.cockpit.segmentTime).not.toHaveText(before);

  await planner.shelter.choose("exposed");

  await expect(planner.cockpit.segmentTime).toHaveText(before);
  await expect(planner.shelter.assumption).toHaveCount(0);
});

test("the shelter choices fit a phone @mobile-only @mobile", async ({
  planner,
  seed,
}) => {
  await seed(twoSprints);

  await expect(planner.shelter.preset("dense")).toBeVisible();
  expect(await planner.horizontalOverflow()).toBe(0);
});
