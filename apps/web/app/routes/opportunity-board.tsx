"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Rider } from "@scout/analysis";
import { formatDuration } from "../components/time";
import { getRouteForecast } from "./forecast-cache";
import type { DrawnRoute, Point } from "./library";
import { shelterPresets } from "@scout/application/shelter";
import { targetDifference, type Availability } from "./attempt";
import {
  nextExpiry,
  rankOpportunities,
  type ForecastState,
  type Opportunity,
} from "./opportunities";
const sparkWidth = 160;
const sparkHeight = 36;
function Sparkline({ row }: { row: Opportunity }) {
  const values = row.timesS.filter((t): t is number => t !== null);
  if (!values.length) return <span className="spark-empty">No data</span>;
  const low = Math.min(...values, row.calmTimeS ?? Infinity);
  const high = Math.max(...values, row.calmTimeS ?? -Infinity);
  const span = Math.max(1, high - low);
  const x = (i: number) =>
    (i / Math.max(1, row.timesS.length - 1)) * sparkWidth;
  const y = (t: number) => 4 + ((t - low) / span) * (sparkHeight - 8);
  const segments: string[] = [];
  row.timesS.forEach((t, i) => {
    if (t === null) return;
    const point = `${x(i).toFixed(1)} ${y(t).toFixed(1)}`;
    if (i === 0 || row.timesS[i - 1] === null) segments.push(`M${point}`);
    else segments[segments.length - 1] += ` L${point}`;
  });
  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${sparkWidth} ${sparkHeight}`}
      aria-hidden="true"
    >
      {row.calmTimeS !== null && (
        <line
          x1={0}
          x2={sparkWidth}
          y1={y(row.calmTimeS)}
          y2={y(row.calmTimeS)}
          className="still-air-line"
        />
      )}
      {segments.map((d, i) => (
        <path key={i} d={d} className="time-curve" />
      ))}
      {row.bestTimeS !== null && (
        <circle
          cx={x(row.bestIndex)}
          cy={y(row.bestTimeS)}
          r={3.5}
          className="best-hour-point"
        />
      )}
    </svg>
  );
}
export default function OpportunityBoard({
  routes,
  rider,
  daylightDryOnly,
  activeSlot,
  onOpen,
  availability,
}: {
  routes: DrawnRoute[];
  rider: Rider;
  daylightDryOnly: boolean;
  activeSlot: number;
  onOpen: (slot: number, at: string) => void;
  availability: Availability | null;
}) {
  const [enabled, setEnabled] = useState(false);
  const [forecasts, setForecasts] = useState<Map<string, ForecastState>>(
    () => new Map(),
  );
  const [generation, setGeneration] = useState(0);
  // Only Refresh and the expiry timer bypass the forecast cache, and only for
  // the fetch they start.
  const forceNext = useRef(false);
  const reload = useCallback(() => {
    forceNext.current = true;
    setGeneration((g) => g + 1);
  }, []);
  // Keyed by content: saving a target or shelter makes a new routes array but
  // must not refetch the board.
  const targetsKey = JSON.stringify(
    routes.map((route) => ({
      id: route.id,
      point: route.points[0]!,
      confirmed: route.confirmed,
    })),
  );
  const targets = useMemo(
    () =>
      JSON.parse(targetsKey) as {
        id: string;
        point: Point;
        confirmed: boolean;
      }[],
    [targetsKey],
  );
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const force = forceNext.current;
    forceNext.current = false;
    setForecasts(
      new Map(targets.map((t) => [t.id, { status: "loading" as const }])),
    );
    const queue = [...targets];
    const worker = async () => {
      while (queue.length && !cancelled) {
        const target = queue.shift()!;
        let state: ForecastState;
        try {
          state = {
            status: "ready",
            forecast: await getRouteForecast(target.point, target.confirmed, {
              force,
            }),
          };
        } catch (cause) {
          state = {
            status: "error",
            message:
              cause instanceof Error ? cause.message : "Forecast unavailable.",
          };
        }
        if (!cancelled)
          setForecasts((current) => new Map(current).set(target.id, state));
      }
    };
    void Promise.all(Array.from({ length: 3 }, worker));
    return () => {
      cancelled = true;
    };
  }, [enabled, targets, generation]);
  // Re-rank once the earliest forecast passes its freshness window, so a board
  // left open does not keep recommending hours from a stale forecast.
  useEffect(() => {
    if (!enabled) return;
    const expiry = nextExpiry(forecasts);
    if (expiry === null) return;
    const timer = window.setTimeout(
      reload,
      Math.max(60_000, expiry - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [enabled, forecasts, reload]);
  const rows = useMemo(
    () =>
      enabled
        ? rankOpportunities(
            routes,
            forecasts,
            rider,
            daylightDryOnly,
            availability,
          )
        : [],
    [enabled, routes, forecasts, rider, daylightDryOnly, availability],
  );
  const pending = rows.filter((row) => row.status === "loading").length;
  const timeLabel = (at: string) =>
    new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(at));
  const gainLabel = (gainS: number) => {
    const rounded = Math.round(gainS);
    if (rounded === 0) return "±0s";
    return `${rounded > 0 ? "−" : "+"}${formatDuration(Math.abs(rounded))}`;
  };
  return (
    <section
      className="opportunity-board"
      data-testid="opportunity-board"
      aria-label="Opportunity board"
    >
      <div className="board-heading">
        <div>
          <h3>Opportunity board</h3>
          <span>
            Every saved segment at its own best hour in the next 48 hours ·
            {daylightDryOnly ? " dry daylight only" : " any hour"}
            {availability
              ? ` · Within availability (${availability.timeZone})`
              : ""}
          </span>
        </div>
        {!enabled ? (
          <button
            type="button"
            className="primary"
            onClick={() => setEnabled(true)}
            disabled={routes.length === 0}
          >
            Rank my segments
          </button>
        ) : (
          <button type="button" onClick={reload} disabled={pending > 0}>
            Refresh
          </button>
        )}
      </div>
      {!enabled && (
        <p className="board-note">
          Shares each saved segment’s start location with Open-Meteo, one
          request per segment.
        </p>
      )}
      {enabled && (
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Opportunity board table"
        >
          <table>
            <caption className="sr-only">
              Segments ranked by time gained at their best hour
            </caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Segment</th>
                <th scope="col">Best hour</th>
                <th scope="col">Vs still air</th>
                <th scope="col">48 hours</th>
                <th scope="col">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, position) => (
                <tr
                  key={row.route.id}
                  data-testid="board-row"
                  data-status={row.status}
                  aria-current={
                    row.route.slot === activeSlot ? "true" : undefined
                  }
                >
                  <td>{row.status === "ranked" ? position + 1 : "–"}</td>
                  <th scope="row">
                    {row.route.name}
                    {row.route.shelter && row.route.shelter !== "exposed" && (
                      <small className="board-target">
                        {shelterPresets[row.route.shelter].label} · assumed
                        shelter
                      </small>
                    )}
                    <small className="board-target">
                      {row.route.terrainMode === "terrain"
                        ? "Terrain-aware"
                        : "Flat-road model"}
                    </small>
                    {row.route.targetTimeS != null && (
                      <small className="board-target">
                        {targetDifference(row.bestTimeS, row.route.targetTimeS)}
                      </small>
                    )}
                  </th>
                  <td>{row.bestAt ? timeLabel(row.bestAt) : row.reason}</td>
                  <td
                    className="board-gain"
                    data-tone={
                      row.gainS === null || Math.round(row.gainS) === 0
                        ? "neutral"
                        : row.gainS > 0
                          ? "gain"
                          : "loss"
                    }
                  >
                    {row.gainS !== null
                      ? gainLabel(row.gainS)
                      : row.status === "loading"
                        ? "…"
                        : "–"}
                  </td>
                  <td>
                    <Sparkline row={row} />
                  </td>
                  <td>
                    <button
                      type="button"
                      disabled={!row.bestAt}
                      onClick={() => onOpen(row.route.slot, row.bestAt!)}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {enabled && (
        <p className="board-note" role="status">
          {pending > 0
            ? `Loading ${pending} of ${rows.length} forecasts…`
            : "Same rider, model and forecast source as the cockpit. Open jumps to that segment’s best hour."}
        </p>
      )}
    </section>
  );
}
