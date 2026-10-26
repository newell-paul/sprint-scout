import { useState } from "react";
import { expect, it } from "vitest";
import { render } from "vitest-browser-react/pure";
import type { RiderInput } from "@scout/analysis";
import RiderSettings from "./rider-settings";
import { resolveRider } from "./rider";

// Stands in for the planner: keeps the saved numbers and derives the pace.
function Planner({ initial = null }: { initial?: RiderInput | null }) {
  const [input, setInput] = useState(initial);
  return (
    <RiderSettings
      input={input}
      calmSpeedMps={resolveRider(input).calmSpeedKmh / 3.6}
      unit="km/h"
      onChange={(next) => {
        setInput(next);
        return true;
      }}
    />
  );
}

it("a change the browser could not store says it lasts until the page closes", async () => {
  let stored = false;
  const screen = await render(
    <RiderSettings
      input={null}
      calmSpeedMps={11}
      unit="km/h"
      onChange={() => stored}
    />,
  );
  await screen.getByText("Rider", { exact: false }).first().click();

  await screen.getByLabelText("Sustained power").fill("400");

  await expect
    .element(screen.getByText(/Could not save your numbers/))
    .toHaveTextContent(
      "Could not save your numbers in this browser; they apply until you close the page.",
    );

  stored = true;
  await screen.getByLabelText("Sustained power").fill("410");

  await expect
    .element(screen.getByText(/Stored in this browser only/))
    .toBeVisible();
});

it("an out-of-range CdA is refused and the saved numbers stand", async () => {
  const screen = await render(<Planner />);
  await screen.getByText("Rider", { exact: false }).first().click();
  await screen.getByLabelText("Sustained power").fill("400");
  const summary = screen.getByTestId("rider-summary");
  await expect.element(summary).toHaveTextContent("Your numbers");
  const saved = summary.element().textContent;

  await screen.getByLabelText("CdA").fill("0.9");

  await expect.element(screen.getByText(/^CdA must be/)).toBeVisible();
  await expect.element(summary).toHaveTextContent(saved!);
});

it("use reference rider restores the default pace", async () => {
  const screen = await render(
    <Planner initial={{ powerW: 400, massKg: 85, cdaM2: 0.3 }} />,
  );
  const summary = screen.getByTestId("rider-summary");
  await expect.element(summary).toHaveTextContent("Your numbers");
  await screen.getByText("Rider", { exact: false }).first().click();

  await screen.getByRole("button", { name: "Use reference rider" }).click();

  await expect
    .element(summary)
    .toHaveTextContent("Reference rider · 40.0 km/h");
});
