import type { Locator, Page } from "@playwright/test";

// Counts pixels of a colour in a canvas screenshot: the one check that proves
// MapLibre actually painted a layer rather than mounting an empty map.
export async function paintedPixels(page: Page, canvas: Locator, colours: string | string[], tolerance = 16) {
  const png = (await canvas.screenshot()).toString("base64");
  const wanted = [colours].flat().map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
  return page.evaluate(
    async ([data, wanted, tol]) => {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      const scratch = document.createElement("canvas");
      scratch.width = image.width;
      scratch.height = image.height;
      const context = scratch.getContext("2d")!;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, scratch.width, scratch.height).data;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4)
        if (
          wanted.some(
            ([red, green, blue]) =>
              Math.abs(pixels[i]! - red!) <= tol &&
              Math.abs(pixels[i + 1]! - green!) <= tol &&
              Math.abs(pixels[i + 2]! - blue!) <= tol,
          )
        )
          count++;
      return count;
    },
    [png, wanted, tolerance] as const,
  );
}

export const horizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
