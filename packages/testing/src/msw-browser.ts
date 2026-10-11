import { setupWorker } from "msw/browser";
import { openMeteoHandlers } from "./handlers";
import { defaultOpenMeteoConfig, type OpenMeteoConfig } from "./open-meteo";

/** A browser msw worker preloaded with the Open-Meteo handlers for `config`. */
export function openMeteoWorker(
  config: OpenMeteoConfig = defaultOpenMeteoConfig(),
) {
  return setupWorker(...openMeteoHandlers(config));
}
