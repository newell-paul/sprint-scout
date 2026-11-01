// Contract drift check, advisory in Checks: fetch live Open-Meteo responses
// and validate them against the contract schemas and the recorded fixtures'
// unit tables. Exits non-zero on any drift.
import { openMeteoForecastResponse } from "@scout/contracts";
import { openMeteoHosts, recorded } from "./open-meteo";

const hourMs = 3_600_000;
const start = Math.ceil(Date.now() / hourMs) * hourMs;
const slice = (ms: number) => new Date(ms).toISOString().slice(0, 16);

const checks = [
  {
    name: "forecast (browser path)",
    url: `${openMeteoHosts.forecast}?latitude=51.5&longitude=-0.12&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,precipitation_probability,weather_code,is_day&wind_speed_unit=ms&timeformat=unixtime&timezone=GMT&start_hour=${slice(start)}&end_hour=${slice(start + 47 * hourMs)}`,
    schema: openMeteoForecastResponse,
    units: () => recorded().forecast.hourly_units,
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
