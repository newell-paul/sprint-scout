import { expect, it, vi } from "vitest";
import { render } from "vitest-browser-react/pure";
import SegmentSlots from "./segment-slots";
import { aRoute, aria } from "../../test/fixtures";

const routes = [
  aRoute({ id: "hill", name: "Test hill", slot: 0 }),
  aRoute({ id: "flat", name: "River flat", slot: 2 }),
];

it("empty: one empty slot, selected", async () => {
  const screen = await render(
    <SegmentSlots routes={[]} active={0} onSelect={() => {}} />,
  );
  const group = screen.getByRole("group", { name: "Segments" });
  await expect
    .element(
      group.getByRole("button", { name: "Segment 1: empty, draw a segment" }),
    )
    .toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => group.getByRole("button").elements().length).toBe(1);
  await aria(
    "segment-slots.empty",
    screen.getByRole("group", { name: "Segments" }),
  );
});

it("ready: saved segments in slot order plus the next free slot", async () => {
  const screen = await render(
    <SegmentSlots routes={routes} active={2} onSelect={() => {}} />,
  );
  const group = screen.getByRole("group", { name: "Segments" });
  await expect.poll(() => group.getByRole("button").elements().length).toBe(3);
  await expect
    .element(group.getByRole("button", { name: "Segment 3: River flat" }))
    .toHaveAttribute("aria-pressed", "true");
  await expect
    .element(group.getByRole("button", { name: "Segment 1: Test hill" }))
    .toHaveAttribute("aria-pressed", "false");
  await expect
    .element(
      group.getByRole("button", { name: "Segment 2: empty, draw a segment" }),
    )
    .toBeVisible();
  await aria("segment-slots.ready", group);
});

it("choosing a slot hands its index to onSelect", async () => {
  const onSelect = vi.fn();
  const screen = await render(
    <SegmentSlots routes={routes} active={0} onSelect={onSelect} />,
  );
  await screen.getByRole("button", { name: "Segment 3: River flat" }).click();
  expect(onSelect).toHaveBeenCalledWith(2);
});

it("disabled: every slot is inert while the map is busy", async () => {
  const screen = await render(
    <SegmentSlots routes={routes} active={0} onSelect={() => {}} disabled />,
  );
  const group = screen.getByRole("group", { name: "Segments" });
  for (const name of [
    "Segment 1: Test hill",
    "Segment 2: empty, draw a segment",
    "Segment 3: River flat",
  ])
    await expect.element(group.getByRole("button", { name })).toBeDisabled();
  await aria("segment-slots.disabled", group);
});

it("overflow: the arrows follow the scroll position", async () => {
  const many = Array.from({ length: 12 }, (_, slot) =>
    aRoute({ id: `route-${slot}`, name: `Segment number ${slot + 1}`, slot }),
  );
  const screen = await render(
    <SegmentSlots routes={many} active={0} onSelect={() => {}} />,
  );
  const left = screen.getByRole("button", { name: "Scroll segments left" });
  const right = screen.getByRole("button", { name: "Scroll segments right" });
  await expect.element(left).toBeDisabled();
  await expect.element(right).toBeEnabled();
  await right.click();
  await expect.element(left).toBeEnabled();
});
