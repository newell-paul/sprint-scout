import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { openMeteoHandlers } from "./handlers";
import { defaultOpenMeteoConfig, type OpenMeteoConfig } from "./open-meteo";

export { openMeteoHandlers };
export { http, HttpResponse };
export function openMeteoServer(
  config: OpenMeteoConfig = defaultOpenMeteoConfig(),
) {
  return setupServer(...openMeteoHandlers(config));
}
