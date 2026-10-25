// Contract drift check, advisory in Checks: fetch live Open-Meteo responses
// and validate them against the contract schemas and the recorded fixtures'
// unit tables. Exits non-zero on any drift.
import {
  openMeteoArchiveResponse,
  openMeteoElevationResponse,
  openMeteoForecastResponse,
} from "@scout/contracts";
import { openMeteoHosts, recorded } from "./open-meteo";

const hourMs = 3_600_000;
const start = Math.ceil(Date.now() / hourMs) * hourMs;
const slice = (ms: number) => new Date(ms).toISOString().slice(0, 16);
const day = (offset: number) =>
  new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);

const checks = [
  {
    name: "forecast (browser path)",
    url: `${openMeteoHosts.forecast}?latitude=51.5&longitude=-0.12&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,precipitation_probability,weather_code,is_day&wind_speed_unit=ms&timeformat=unixtime&timezone=GMT&start_hour=${slice(start)}&end_hour=${slice(start + 47 * hourMs)}`,
    schema: openMeteoForecastResponse,
    units: () => recorded().forecast.hourly_units,
  },
  {
    name: "elevation",
    url: `${openMeteoHosts.elevation}?latitude=51.5,51.505,51.51&longitude=-0.12,-0.12,-0.12`,
    schema: openMeteoElevationResponse,
    units: () => ({}),
  },
  {
    name: "archive",
    url: `${openMeteoHosts.archive}?latitude=51.5&longitude=-0.12&start_date=${day(9)}&end_date=${day(8)}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation&wind_speed_unit=ms&timeformat=unixtime&timezone=GMT`,
    schema: openMeteoArchiveResponse,
    units: () => recorded().archive.hourly_units,
  },
];

let failed = false;
for (const check of checks) {
  const response = await fetch(check.url, {
    headers: { accept: "application/json" },
  });
  const body: unknown = await response.json().catch(() => null);
  const parsed = check.schema.safeParse(body);
  const first = Array.isArray(body) ? body[0] : body;
  const liveUnits =
    (first as { hourly_units?: Record<string, string> } | null)?.hourly_units ??
    {};
  const unitDrift = Object.entries(check.units()).filter(
    ([key, value]) => liveUnits[key] !== value,
  );
  const ok = response.ok && parsed.success && unitDrift.length === 0;
  failed ||= !ok;
  console.log(
    `${ok ? "ok  " : "DRIFT"} ${check.name}: HTTP ${response.status}` +
      (parsed.success
        ? ""
        : `; schema: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`) +
      (unitDrift.length
        ? `; units: ${unitDrift.map(([k, v]) => `${k} expected ${v} got ${liveUnits[k]}`).join(", ")}`
        : ""),
  );
}
if (failed) process.exit(1);
