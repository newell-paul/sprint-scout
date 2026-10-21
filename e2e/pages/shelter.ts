import type { Locator, Page } from "@playwright/test";

const presets = {
  exposed: "Exposed 0% wind reduction",
  sheltered: "Sheltered 35% wind reduction",
  dense: "Dense 65% wind reduction",
} as const;
export type ShelterLevel = keyof typeof presets;

/** The per-segment shelter presets. */
export class Shelter {
  readonly group: Locator;
  readonly assumption: Locator;

  constructor(private readonly page: Page) {
    this.group = page.getByRole("group", { name: "Shelter level" });
    this.assumption = page.getByTestId("shelter-assumption");
  }

  preset(level: ShelterLevel) {
    return this.group.getByRole("button", {
      name: presets[level],
      exact: true,
    });
  }

  async choose(level: ShelterLevel) {
    await this.preset(level).click();
  }

  async chooseWithKeyboard(level: ShelterLevel) {
    await this.preset(level).focus();
    await this.page.keyboard.press("Enter");
  }
}
