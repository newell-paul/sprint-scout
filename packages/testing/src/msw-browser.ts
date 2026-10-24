import { setupWorker } from "msw/browser";
import { HttpNetworkFrame } from "msw/experimental";
import type { UnhandledFrameHandle } from "msw";
import { openMeteoHandlers } from "./handlers";
import { defaultOpenMeteoConfig, type OpenMeteoConfig } from "./open-meteo";

export function openMeteoWorker(
  config: OpenMeteoConfig = defaultOpenMeteoConfig(),
) {
  return setupWorker(...openMeteoHandlers(config));
}

// Local modules and assets pass through; anything else is recorded and fails
// as a network error, so a component test can never reach the internet.
// msw 3 exposes the request only through its experimental frame API, so the
// no-internet test fails loudly if that API changes.
export function blockExternal(
  origin: string,
  record: (target: string) => void,
): UnhandledFrameHandle {
  return ({ frame, defaults }) => {
    if (frame instanceof HttpNetworkFrame) {
      const { url } = frame.data.request;
      if (new URL(url).origin === origin) return;
      record(url);
    } else record(`${frame.protocol} frame`);
    defaults.error();
  };
}
