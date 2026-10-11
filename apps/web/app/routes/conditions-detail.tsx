import {
  routeCrosswind,
  type RouteWindHour,
} from "@scout/application/route-wind";
import { formatSpeed, type SpeedUnit } from "../components/speed";
import type { Point } from "./library";

export default function ConditionsDetail({
  hour,
  points,
  unit,
}: {
  hour: RouteWindHour;
  points: Point[];
  unit: SpeedUnit;
}) {
  const wind = (value: number | null | undefined) =>
    value == null ? "Unavailable" : formatSpeed(value, unit);
  return (
    <section className="conditions-detail" aria-label="Attempt conditions">
      <dl>
        <div>
          <dt>Sustained wind</dt>
          <dd>{wind(hour.speedMps)}</dd>
        </div>
        <div>
          <dt>Gusts</dt>
          <dd>{wind(hour.gustMps)}</dd>
        </div>
        <div>
          <dt>Mean crosswind</dt>
          <dd>{wind(routeCrosswind(points, hour))}</dd>
        </div>
        <div>
          <dt>Precipitation</dt>
          <dd>
            {hour.precipitationMm == null
              ? "Unavailable"
              : `${hour.precipitationMm.toFixed(1)} mm`}
            {hour.precipitationProbabilityPct == null
              ? " · chance unavailable"
              : ` · ${Math.round(hour.precipitationProbabilityPct)}% chance`}
          </dd>
        </div>
      </dl>
      <small>
        Near-start forecast · Wind at 10 m; crosswind averaged along segment
        direction. Gusts and precipitation cover the preceding hour. Not a
        road-safety assessment.
      </small>
    </section>
  );
}
