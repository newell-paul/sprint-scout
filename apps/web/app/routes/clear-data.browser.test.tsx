import { afterEach, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react/pure";
import ClearData from "./clear-data";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

it("backing out: keep returns to the clear button and touches nothing", async () => {
  localStorage.setItem("sprint-scout.drawn-routes.v1", "[]");
  localStorage.setItem("sprint-scout.rider.v1", "{}");
  const screen = await render(<ClearData />);

  await screen.getByRole("button", { name: "Clear saved data" }).click();
  await screen.getByRole("button", { name: "Keep my data" }).click();

  await expect
    .element(screen.getByRole("button", { name: "Clear saved data" }))
    .toBeVisible();
  await expect
    .element(screen.getByRole("button", { name: "Delete everything" }))
    .not.toBeInTheDocument();
  expect(localStorage.getItem("sprint-scout.drawn-routes.v1")).toBe("[]");
  expect(localStorage.getItem("sprint-scout.rider.v1")).toBe("{}");
});

it("blocked storage: says so and keeps the saved data", async () => {
  localStorage.setItem("sprint-scout.rider.v1", "{}");
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
    throw new DOMException("Blocked", "SecurityError");
  });
  const screen = await render(<ClearData />);

  await screen.getByRole("button", { name: "Clear saved data" }).click();
  await screen.getByRole("button", { name: "Delete everything" }).click();

  await expect
    .element(screen.getByRole("alert"))
    .toHaveTextContent("Cannot clear saved data in this browser.");
  expect(localStorage.getItem("sprint-scout.rider.v1")).toBe("{}");
});
