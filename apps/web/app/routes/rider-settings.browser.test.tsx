import { expect, it } from "vitest";
import { render } from "vitest-browser-react/pure";
import RiderSettings from "./rider-settings";

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
