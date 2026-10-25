import type {
  RouteRideEffect,
  RouteWindForecast,
} from "@scout/application/route-wind";
import { useState } from "react";
import { formatDuration, formatWeekdayHour } from "./time";
import { conditionBands, describeConditions } from "./conditions";

export default function TimeChart({
  forecast,
  effects,
  index,
  bestIndex,
  ticks,
  label,
  onSelect,
}: {
  forecast: RouteWindForecast;
  effects: (RouteRideEffect | null)[];
  index: number;
  bestIndex: number;
  ticks: { index: number; midnight: boolean; label: string }[];
  label: (at: string) => string;
  onSelect: (index: number) => void;
}) {
  const valid = effects.filter(
    (effect): effect is RouteRideEffect => effect !== null,
  );
  const baseline = valid[0]?.calmTimeS ?? 0;
  const minimum = Math.min(
    baseline,
    ...valid.map((effect) => effect.windTimeS),
  );
  const maximum = Math.max(
    baseline,
    ...valid.map((effect) => effect.windTimeS),
  );
  const padding = Math.max(3, (maximum - minimum) * 0.2);
  const lower = minimum - padding;
  const upper = maximum + padding;
  const plotY = (seconds: number) =>
    100 - ((seconds - lower) / (upper - lower)) * 80;
  const plotX = (position: number) => 12 + (position / 47) * 936;
  const paths: string[] = [];
  effects.forEach((effect, position) => {
    if (!effect) return;
    const point = `${plotX(position)} ${plotY(effect.windTimeS)}`;
    if (position === 0 || !effects[position - 1]) paths.push(`M${point}`);
    else paths[paths.length - 1] += ` L${point}`;
  });
  const [keyboard, setKeyboard] = useState(false);
  const selected = effects[index];
  const best = effects[bestIndex];
  const bands = conditionBands(forecast.hours);
  const halfHour = (936 / 47) * 0.5;
  const bandX = (position: number) => plotX(position) - halfHour;
  const bandWidth = (band: { from: number; to: number }) =>
    plotX(band.to) + halfHour - bandX(band.from);
  return (
    <div className="time-chart" data-testid="time-chart">
      <div className="time-chart-heading">
        <div>
          <h3>Find your window</h3>
          <span>48-hour segment time · Lower is quicker</span>
        </div>
        <div
          className="best-window"
          data-testid="selected-window"
          data-best={best && index === bestIndex ? "true" : "false"}
        >
          <span>
            {best && index === bestIndex ? "Best hour · " : "Selected · "}
            {formatWeekdayHour(forecast.hours[index]!.at)}
          </span>
          <strong data-testid="segment-time-value">
            {selected ? formatDuration(selected.windTimeS) : "Unavailable"}
          </strong>
        </div>
      </div>
      <div className={`time-plot${keyboard ? " keyboard-focus" : ""}`}>
        <svg
          viewBox="0 0 960 120"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {bands.map((band) => (
            <rect
              key={`${band.kind}-${band.from}`}
              x={bandX(band.from)}
              width={bandWidth(band)}
              y={band.kind === "night" ? 0 : 0}
              height={band.kind === "night" ? 120 : 6}
              className={`condition-band condition-${band.kind}`}
              data-testid={`band-${band.kind}`}
              data-from={band.from}
              data-to={band.to}
            />
          ))}
          {[20, 60, 100].map((height) => (
            <line
              key={height}
              x1="12"
              x2="948"
              y1={height}
              y2={height}
              className="time-grid"
            />
          ))}
          {valid.length > 0 && (
            <line
              x1="12"
              x2="948"
              y1={plotY(baseline)}
              y2={plotY(baseline)}
              className="still-air-line"
            />
          )}
          {paths.map((path, position) => (
            <path key={position} d={path} className="time-curve" />
          ))}
          {effects.map((effect, position) =>
            !effect ? (
              <path
                key={position}
                d={`M${plotX(position) - 3} 107 l6 6 m0 -6 l-6 6`}
                className="missing-hour"
              />
            ) : (
              <circle
                key={position}
                cx={plotX(position)}
                cy={plotY(effect.windTimeS)}
                r="2"
                className="time-point"
              />
            ),
          )}
          {best && (
            <circle
              cx={plotX(bestIndex)}
              cy={plotY(best.windTimeS)}
              r="6"
              className="best-hour-point"
            />
          )}
          <line
            x1={plotX(index)}
            x2={plotX(index)}
            y1="8"
            y2="114"
            className="selected-hour-line"
          />
          {selected && (
            <circle
              cx={plotX(index)}
              cy={plotY(selected.windTimeS)}
              r="5"
              className="selected-hour-point"
            />
          )}
        </svg>
        <input
          aria-label="Forecast hour"
          type="range"
          min={0}
          max={47}
          step={1}
          value={index}
          aria-valuetext={`${label(forecast.hours[index]!.at)} · ${selected ? formatDuration(selected.windTimeS) : "Time unavailable"}`}
          onChange={(event) => onSelect(Number(event.target.value))}
          onPointerDown={() => setKeyboard(false)}
          onKeyDown={() => setKeyboard(true)}
          onBlur={() => setKeyboard(false)}
        />
      </div>
      <div className="time-chart-ticks" aria-hidden="true">
        {ticks.map((tick) => (
          <span
            key={tick.index}
            style={{ left: `${1.25 + (tick.index / 47) * 97.5}%` }}
            className={
              tick.midnight
                ? "day-label"
                : `hour-label${tick.label === "12:00" ? " noon-label" : ""}`
            }
            data-testid={tick.midnight ? "wind-day-tick" : undefined}
          >
            {tick.label}
          </span>
        ))}
      </div>
      <div className="time-chart-key">
        <span>
          – – Still air{" "}
          {valid.length ? formatDuration(baseline) : "unavailable"}
        </span>
        <span>○ Best hour</span>
        <span>× Unavailable</span>
        <span className="key-night">Night</span>
        <span className="key-wet">Rain or snow</span>
        <span>Drag or use arrow keys</span>
      </div>
      <details className="hourly-time-table">
        <summary>Hourly times</summary>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Hourly times table"
        >
          <table>
            <caption>
              Estimated times ·{" "}
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </caption>
            <thead>
              <tr>
                <th scope="col">Hour</th>
                <th scope="col">Segment time</th>
                <th scope="col">Conditions</th>
              </tr>
            </thead>
            <tbody>
              {forecast.hours.map((hour, position) => (
                <tr
                  key={hour.at}
                  aria-current={position === index ? "true" : undefined}
                >
                  <th scope="row">
                    <button type="button" onClick={() => onSelect(position)}>
                      {label(hour.at)}
                    </button>
                  </th>
                  <td>
                    {effects[position]
                      ? formatDuration(effects[position]!.windTimeS)
                      : "Unavailable"}
                  </td>
                  <td>{describeConditions(hour)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
