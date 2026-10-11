import { setupWorker } from "msw/browser";
import { openMeteoHandlers } from "./handlers";
import { defaultOpenMeteoConfig, type OpenMeteoConfig } from "./open-meteo";

export function openMeteoWorker(
  config: OpenMeteoConfig = defaultOpenMeteoConfig(),
) {
  return setupWorker(...openMeteoHandlers(config));
}
