import type {
  RouteRideEffect,
  RouteWindHour,
} from "@scout/application/route-wind";
import {
  compassDirection,
  formatSpeed,
  speedValue,
  type SpeedUnit,
} from "./speed";
import { formatDuration, formatTimeDifference } from "./time";
import { targetDifference } from "../routes/attempt";
import { shelterPresets } from "@scout/application/shelter";

function dialPoint(fraction: number, radius: number) {
  const angle = Math.PI * (1 - Math.max(0, Math.min(1, fraction)));
  return {
    x: 120 + radius * Math.cos(angle),
    y: 120 - radius * Math.sin(angle),
  };
}

export default function RideCockpit({
  effect,
  hour,
  unit,
  description,
  calmSpeedMps = 40 / 3.6,
  targetTimeS = null,
  terrainMode = false,
  terrainMissing = false,
}: {
  effect: RouteRideEffect | null;
  hour: RouteWindHour;
  unit: SpeedUnit;
  description: string;
  calmSpeedMps?: number;
  targetTimeS?: number | null;
  terrainMode?: boolean;
  terrainMissing?: boolean;
}) {
  const maximum = Math.max(
    80,
    Math.ceil(
      speedValue(
        Math.max(
          effect?.windSpeedMps ?? 0,
          effect?.calmSpeedMps ?? calmSpeedMps,
          (effect?.calmSpeedMps ?? 0) + (effect?.band?.speedDeltaHighMps ?? 0),
        ),
      ) / 20,
    ) * 20,
  );
  const fraction = (speed: number) => speedValue(speed) / maximum;
  const needle = dialPoint(fraction(effect?.windSpeedMps ?? 0), 73);
  const reached = dialPoint(fraction(effect?.windSpeedMps ?? 0), 95);
  const baseline = dialPoint(
    fraction(effect?.calmSpeedMps ?? calmSpeedMps),
    97,
  );
  const bandLow = dialPoint(
    fraction(
      (effect?.calmSpeedMps ?? 0) + (effect?.band?.speedDeltaLowMps ?? 0),
    ),
    88,
  );
  const bandHigh = dialPoint(
    fraction(
      (effect?.calmSpeedMps ?? 0) + (effect?.band?.speedDeltaHighMps ?? 0),
    ),
    88,
  );
  const tone =
    !effect || Math.round(effect.timeDeltaS) === 0
      ? "neutral"
      : effect.timeDeltaS < 0
        ? "gain"
        : "loss";
  return (
    <section
      className="ride-cockpit"
      data-testid="ride-cockpit"
      data-tone={tone}
      aria-label="Ride instruments"
      aria-live="polite"
    >
      <div className="cockpit-speed">
        <span className="instrument-label">Modelled average speed</span>
        <svg className="speed-dial" viewBox="0 0 240 145" aria-hidden="true">
          <path d="M25 120 A95 95 0 0 1 215 120" className="dial-track" />
          {effect && (
            <path
              d={`M25 120 A95 95 0 0 1 ${reached.x} ${reached.y}`}
              className="dial-progress"
            />
          )}
          {Array.from({ length: 21 }, (_, position) => {
            const inner = dialPoint(
              position / 20,
              position % 5 === 0 ? 76 : 82,
            );
            const outer = dialPoint(position / 20, 88);
            const label = dialPoint(position / 20, 108);
            return (
              <g key={position}>
                <line
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  className="dial-tick"
                />
                {position % 5 === 0 && (
                  <text x={label.x} y={label.y + 4} textAnchor="middle">
                    {Math.round(
                      speedValue(((maximum / 3.6) * position) / 20, unit),
                    )}
                  </text>
                )}
              </g>
            );
          })}
          {effect?.band && (
            <path
              d={`M${bandLow.x} ${bandLow.y} A88 88 0 0 1 ${bandHigh.x} ${bandHigh.y}`}
              className="dial-range"
            />
          )}
          <circle
            cx={baseline.x}
            cy={baseline.y}
            r="4"
            className="dial-baseline"
          />
          {effect && (
            <>
              <line
                x1="120"
                y1="120"
                x2={needle.x}
                y2={needle.y}
                className="dial-needle"
              />
              <circle cx="120" cy="120" r="5" className="dial-hub" />
            </>
          )}
        </svg>
        <strong className="dial-readout" data-testid="cockpit-speed">
          {effect ? formatSpeed(effect.windSpeedMps, unit) : "Unavailable"}
        </strong>
        <span className="dial-caption">
          ○ Still-air baseline{terrainMode ? " · same terrain " : " "}
          {terrainMode && !effect
            ? "Unavailable"
            : formatSpeed(effect?.calmSpeedMps ?? calmSpeedMps, unit)}
        </span>
      </div>
      <div className="cockpit-wind">
        <span className="instrument-label">Wind · north up</span>
        <div className="compass-dial">
          <svg
            viewBox="0 0 200 200"
            className="wind-compass"
            aria-hidden="true"
          >
            <circle cx="100" cy="100" r="78" className="compass-face" />
            <circle cx="100" cy="100" r="78" className="compass-ring" />
            {Array.from({ length: 36 }, (_, position) => (
              <line
                key={position}
                x1="100"
                y1="30"
                x2="100"
                y2={position % 9 === 0 ? 40 : 35}
                transform={`rotate(${position * 10} 100 100)`}
                className={
                  position % 9 === 0 ? "compass-tick major" : "compass-tick"
                }
              />
            ))}
            <text x="100" y="12" textAnchor="middle">
              N
            </text>
            <text x="100" y="197" textAnchor="middle">
              S
            </text>
            <text x="7" y="104" textAnchor="middle">
              W
            </text>
            <text x="193" y="104" textAnchor="middle">
              E
            </text>
            {hour.flowDegrees !== null &&
              hour.speedMps !== null &&
              hour.speedMps > 0 && (
                <g transform={`rotate(${hour.flowDegrees} 100 100)`}>
                  <path
                    d="M100 24 L88 46 L100 40 L112 46 Z"
                    className="compass-arrow"
                  />
                  <path d="M100 160 V178" className="compass-tail" />
                </g>
              )}
          </svg>
          <strong>
            {hour.speedMps === null
              ? "Unavailable"
              : hour.speedMps === 0
                ? "Calm"
                : formatSpeed(hour.speedMps, unit)}
          </strong>
        </div>
        <span className="sr-only">
          {hour.speedMps && hour.flowDegrees !== null
            ? `Towards ${compassDirection(hour.flowDegrees)}`
            : "No wind direction"}
        </span>
        <span className="wind-character">{description}</span>
      </div>
      <div className="cockpit-facts" data-testid="segment-time">
        {effect ? (
          <>
            <span className="time-delta" data-testid="segment-time-difference">
              {formatTimeDifference(effect.timeDeltaS)}
            </span>
            <dl className="timing-facts">
              <div>
                <dt>
                  {terrainMode ? "Still air · same terrain" : "Still air"}
                </dt>
                <dd data-testid="segment-calm-time">
                  {formatDuration(effect.calmTimeS)}
                </dd>
              </div>
              <div>
                <dt>Estimated range</dt>
                <dd>
                  {effect.timeRange
                    ? `${formatDuration(effect.timeRange.lowS)}–${formatDuration(effect.timeRange.highS)}`
                    : "Unavailable"}
                </dd>
              </div>
              <div>
                <dt>Segment distance</dt>
                <dd>
                  {unit === "mph"
                    ? `${((effect.calmTimeS * effect.calmSpeedMps) / 1609.344).toFixed(2)} mi`
                    : `${((effect.calmTimeS * effect.calmSpeedMps) / 1000).toFixed(2)} km`}
                </dd>
              </div>
              {effect.shelter &&
                effect.shelter !== "exposed" &&
                effect.exposedTimeS !== undefined && (
                  <div>
                    <dt>Exposed comparison</dt>
                    <dd>{formatDuration(effect.exposedTimeS)}</dd>
                  </div>
                )}
            </dl>
          </>
        ) : (
          <p data-testid="cockpit-unavailable">
            {terrainMissing
              ? "Terrain is not loaded for this segment. Load terrain in the Terrain panel below, or switch it to the flat-road estimate."
              : hour.speedMps === null
                ? "Wind data is missing for this hour."
                : "This segment cannot be modelled."}
          </p>
        )}
        <p className="cockpit-notes">
          <span className="instrument-note">
            {terrainMode
              ? "Modelled at constant effort · Terrain-aware · Unvalidated"
              : "Modelled at constant effort · Flat road · Terrain not modelled"}
          </span>
          {effect?.shelter && effect.shelter !== "exposed" && (
            <span
              className="instrument-note shelter-assumption"
              data-testid="shelter-assumption"
            >
              {shelterPresets[effect.shelter].label} · assumed shelter
            </span>
          )}
        </p>
        {targetTimeS !== null && (
          <div className="target-comparison" data-testid="target-comparison">
            <span>Target {formatDuration(targetTimeS)}</span>
            <strong>
              {targetDifference(effect?.windTimeS ?? null, targetTimeS)}
            </strong>
            <small>
              Compare with the estimated range; not a success probability.
            </small>
          </div>
        )}
      </div>
    </section>
  );
}
