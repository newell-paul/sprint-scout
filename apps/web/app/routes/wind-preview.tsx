"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Map as RouteMap } from "maplibre-gl";
import type { Rider, RiderInput } from "@scout/analysis";
import {
  describeRouteWind,
  type RouteWindForecast,
  type RouteWindHour,
} from "@scout/application/route-wind";
import RideCockpit from "../components/ride-cockpit";
import TimeChart from "../components/time-chart";
import { bestHourIndex } from "../components/conditions";
import {
  compassDirection,
  formatSpeed,
  type SpeedUnit,
} from "../components/speed";
import { getRouteForecast, peekRouteForecast } from "./forecast-cache";
import type { DrawnRoute, RouteEffort } from "./library";
import RiderSettings from "./rider-settings";
import TargetSettings from "./target-settings";
import ShelterSettings from "./shelter-settings";
import type { Shelter } from "@scout/application/shelter";
import TerrainPanel from "./terrain-panel";
import EffortsPanel from "./efforts-panel";
import type { TerrainProfile } from "@scout/application/terrain";
import ConditionsDetail from "./conditions-detail";
import { startWindParticles } from "./wind-particles";
import { routeEffect } from "./route-effect";
export default function WindPreview({
  route,
  map,
  ready,
  onHour,
  unit,
  rider,
  riderInput,
  onRiderChange,
  daylightDryOnly,
  onDaylightDryChange,
  requestedAt = null,
  requestSeq = 0,
  onTargetChange,
  onTerrainChange,
  onTerrainAutoChange,
  onShelterChange,
  onEffortsChange,
}: {
  route: DrawnRoute;
  map: RouteMap | null;
  ready: boolean;
  onHour?: (hour: RouteWindHour | null) => void;
  unit: SpeedUnit;
  rider: Rider;
  riderInput: RiderInput | null;
  onRiderChange: (input: RiderInput | null) => boolean;
  daylightDryOnly: boolean;
  onDaylightDryChange: (value: boolean) => void;
  requestedAt?: string | null;
  /** Changes on every request, so asking for the same hour again still moves to it. */
  requestSeq?: number;
  onTargetChange: (target: number | null) => boolean;
  onShelterChange: (shelter: Shelter) => boolean;
  onTerrainChange: (
    terrain: TerrainProfile | null,
    mode: "flat" | "terrain",
  ) => boolean;
  onTerrainAutoChange: (auto: boolean) => boolean;
  onEffortsChange: (efforts: RouteEffort[]) => boolean;
}) {
  const [forecast, setForecast] = useState<RouteWindForecast | null>(() =>
    peekRouteForecast(route.points[0]!),
  );
  const [index, setIndex] = useState(() => {
    const cached = peekRouteForecast(route.points[0]!);
    const position = requestedAt
      ? (cached?.hours.findIndex((hour) => hour.at === requestedAt) ?? -1)
      : -1;
    return Math.max(0, position);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [particlesEnabled, setParticlesEnabled] = useState(true);
  const active = useRef<symbol | null>(null);
  const current = forecast?.hours[index];
  const selectedAt = useRef<string | undefined>(undefined);
  selectedAt.current = current?.at;
  const requested = useRef<string | null>(requestedAt);
  requested.current = requestedAt;
  const loaded = useRef<RouteWindForecast | null>(null);
  loaded.current = forecast;
  useEffect(() => {
    onHour?.(current ?? null);
    return () => onHour?.(null);
  }, [current, onHour]);
  const ticks = forecast
    ? forecast.hours.flatMap((h, i) => {
        const date = new Date(h.at);
        const hour = Number(
          new Intl.DateTimeFormat("en-GB", {
            hour: "numeric",
            hourCycle: "h23",
          }).format(date),
        );
        if (hour === 0)
          return [
            {
              index: i,
              midnight: true,
              label: new Intl.DateTimeFormat(undefined, {
                weekday: "short",
                day: "numeric",
              }).format(date),
            },
          ];
        if (hour % 6 === 0)
          return [{ index: i, midnight: false, label: `${hour}:00` }];
        return [];
      })
    : [];
  const effects = useMemo(
    () =>
      forecast?.hours.map((hour) =>
        routeEffect(route, hour, rider, forecast.retrievedAt),
      ) ?? [],
    [forecast, route, rider],
  );
  const rideEffect = effects[index];
  const windDescription = useMemo(
    () => (current ? describeRouteWind(route.points, current) : ""),
    [current, route.points],
  );
  const bestIndex = forecast
    ? bestHourIndex(effects, forecast.hours, daylightDryOnly)
    : -1;
  const days = forecast
    ? [0, 1].map((offset) => {
        const day = new Date();
        day.setDate(day.getDate() + offset);
        const sameDay = (at: string) =>
          new Date(at).toDateString() === day.toDateString();
        return {
          label: offset === 0 ? "Today" : "Tomorrow",
          index: forecast.hours.findIndex((hour) => sameDay(hour.at)),
          active: current ? sameDay(current.at) : false,
        };
      })
    : [];
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const label = (at: string) =>
    new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(at));
  const [longitude, latitude] = route.points[0]!;
  const confirmed = route.confirmed;
  const load = useCallback(
    async (options: { keepIndex?: boolean; force?: boolean } = {}) => {
      const token = Symbol("forecast");
      active.current = token;
      setLoading(true);
      setError("");
      try {
        const result = await getRouteForecast(
          [longitude, latitude],
          confirmed,
          { force: options.force ?? false },
        );
        if (active.current !== token) return;
        const wanted = options.keepIndex
          ? selectedAt.current
          : requested.current;
        const nextIndex = wanted
          ? Math.max(
              0,
              result.hours.findIndex((hour) => hour.at === wanted),
            )
          : 0;
        setForecast(result);
        setIndex(nextIndex);
      } catch (cause) {
        if (active.current !== token) return;
        setForecast(null);
        setError(
          cause instanceof Error && cause.name === "AbortError"
            ? "Forecast request timed out or was cancelled."
            : cause instanceof Error
              ? cause.message
              : "Forecast unavailable.",
        );
      } finally {
        if (active.current === token) setLoading(false);
      }
    },
    [longitude, latitude, confirmed],
  );
  // Deferred a tick so a synchronous unmount (React strict mode) sends nothing.
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      active.current = null;
    };
  }, [load]);
  // A planner left open would otherwise keep timing attempts against a stale
  // forecast; re-fetch once it passes its freshness window.
  useEffect(() => {
    if (!forecast) return;
    const timer = window.setTimeout(
      () => void load({ keepIndex: true, force: true }),
      Math.max(0, forecast.expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [forecast, load]);
  // Jump to an hour requested from the opportunity board for this segment.
  useEffect(() => {
    const hours = loaded.current?.hours;
    if (!hours || !requestedAt) return;
    const position = hours.findIndex((h) => h.at === requestedAt);
    if (position !== -1) setIndex(position);
  }, [requestedAt, requestSeq]);
  useEffect(() => {
    if (!map || !ready || current?.speedMps == null) return;
    const rotation = current.flowDegrees;
    let stopParticles = () => {};
    if (rotation !== null && particlesEnabled)
      stopParticles = startWindParticles(
        map.getContainer(),
        { flowDegrees: rotation, speedMps: current.speedMps },
        {
          reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches,
        },
      );
    return stopParticles;
  }, [map, ready, current, particlesEnabled]);
  const calmSpeedMps = rider.calmSpeedKmh / 3.6;
  const targetSettings = (
    <TargetSettings
      target={route.targetTimeS ?? null}
      onChange={onTargetChange}
    />
  );
  return (
    <section
      className="wind-strip forecast-console"
      aria-label="Route wind forecast"
    >
      {forecast &&
        map &&
        ready &&
        createPortal(
          <button
            type="button"
            className="wind-toggle"
            aria-label="Wind particles"
            aria-pressed={particlesEnabled}
            onClick={() => setParticlesEnabled(!particlesEnabled)}
          >
            <span aria-hidden="true" className="wind-toggle-dot" />
            <span aria-hidden="true">
              Wind {particlesEnabled ? "on" : "off"}
            </span>
          </button>,
          map.getContainer(),
        )}
      {forecast && (
        <>
          <div
            className="wind-time"
            aria-live="polite"
            data-testid="wind-summary"
          >
            <strong>{label(forecast.hours[index]!.at)}</strong>
            <span className="sr-only">
              {current?.speedMps == null
                ? "Wind unavailable for this hour."
                : current.speedMps === 0
                  ? "Calm — no wind direction."
                  : `${formatSpeed(current.speedMps, unit)} towards ${compassDirection(current.flowDegrees!)} · ${windDescription}`}
            </span>
            <span className="sr-only">Hour {index + 1} of 48</span>
          </div>
          <div className="forecast-timeline">
            <div
              className="forecast-navigation"
              aria-label="Forecast navigation"
              role="group"
            >
              <button
                type="button"
                aria-label="Previous hour"
                disabled={index === 0}
                onClick={() => setIndex(index - 1)}
              >
                ←
              </button>
              {days.map((day) => (
                <button
                  type="button"
                  key={day.label}
                  disabled={day.index === -1}
                  aria-pressed={day.active}
                  onClick={() => setIndex(day.index)}
                >
                  {day.label}
                </button>
              ))}
              <button
                type="button"
                className="best-hour-button"
                disabled={bestIndex === -1}
                aria-pressed={bestIndex !== -1 && index === bestIndex}
                aria-describedby="best-hour-explanation"
                onClick={() => setIndex(bestIndex)}
              >
                Best hour
              </button>
              <label className="daylight-filter">
                <input
                  type="checkbox"
                  checked={daylightDryOnly}
                  onChange={(event) =>
                    onDaylightDryChange(event.target.checked)
                  }
                />{" "}
                Dry daylight only
              </label>
              <button
                type="button"
                aria-label="Next hour"
                disabled={index === 47}
                onClick={() => setIndex(index + 1)}
              >
                →
              </button>
            </div>
            <TimeChart
              forecast={forecast}
              effects={effects}
              index={index}
              bestIndex={bestIndex}
              ticks={ticks}
              label={label}
              onSelect={setIndex}
            />
            {bestIndex === -1 && (
              <p role="status">
                No eligible forecast hour matches your filters. Clear the dry
                daylight filter.
              </p>
            )}
          </div>
        </>
      )}
      {targetSettings}
      {forecast && (
        <>
          <RideCockpit
            effect={rideEffect ?? null}
            hour={forecast.hours[index]!}
            unit={unit}
            description={windDescription}
            calmSpeedMps={calmSpeedMps}
            targetTimeS={route.targetTimeS ?? null}
            terrainMode={route.terrainMode === "terrain"}
            terrainMissing={route.terrainMode === "terrain" && !route.terrain}
          />
          <ConditionsDetail
            hour={forecast.hours[index]!}
            points={route.points}
            unit={unit}
          />
          <RiderSettings
            input={riderInput}
            calmSpeedMps={calmSpeedMps}
            unit={unit}
            onChange={onRiderChange}
          />
          <details className="weather-details">
            <summary>About this estimate & best hour</summary>
            <p>
              Constant effort at about {Math.round(rider.calmSpeedKmh)} km/h
              still-air pace ({formatSpeed(calmSpeedMps, unit)}) for{" "}
              {riderInput
                ? `your numbers: ${riderInput.powerW} W, ${riderInput.massKg} kg rider and bike, CdA ${riderInput.cdaM2} m²`
                : "a reference rider and bike of 85 kg"}{" "}
              at a flat-road reference pace.{" "}
              {route.terrainMode === "terrain"
                ? "The selected segment uses its smoothed elevation profile, with a still-air baseline on the same terrain. Steady speed is assumed for each leg; acceleration, braking, stops and drafting are excluded."
                : "Hills, stops and drafting are excluded in flat-road mode."}{" "}
              The dial’s shaded arc and time range use assumed forecast errors,
              not validated confidence; elevation errors are not included. This
              is not a personal prediction. Manual shelter, if selected, is a
              uniform assumed wind reduction; local shelter is not measured. Its
              range includes the exposed scenario.
            </p>
            <p id="best-hour-explanation">
              Largest modelled speed benefit in these 48 hours, or the smallest
              loss if all hours are unfavourable. Missing hours are skipped;
              ties choose the earliest hour.{" "}
              {daylightDryOnly
                ? "Only daylight hours without forecast precipitation are considered; hours with unknown conditions are skipped."
                : "Rain and daylight are not filtered unless you tick Dry daylight only. Neither setting assesses road safety."}
            </p>
          </details>
        </>
      )}
      {!forecast && !error && (
        <div
          className="forecast-placeholder"
          aria-busy="true"
          data-testid="forecast-placeholder"
        />
      )}
      <ShelterSettings
        value={route.shelter ?? "exposed"}
        onChange={onShelterChange}
      />
      <TerrainPanel
        route={route}
        unit={unit}
        onChange={onTerrainChange}
        onAutoChange={onTerrainAutoChange}
      />
      <EffortsPanel
        route={route}
        rider={rider}
        unit={unit}
        onChange={onEffortsChange}
      />
      <div className="wind-actions">
        <small role="status">
          {loading
            ? "Loading wind…"
            : forecast
              ? "Forecast near segment start · Updates automatically"
              : ""}
        </small>
      </div>
      {error && (
        <p role="alert">
          {error}{" "}
          <button type="button" onClick={() => void load({ force: true })}>
            Try again
          </button>
        </p>
      )}
      <details className="weather-details">
        <summary>Weather source</summary>
        <p>
          <a href="https://open-meteo.com/">Open-Meteo</a> ·{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.
          Wind arrows point in the flow direction; optional particle motion is
          illustrative. Forecast wind at 10 metres near the segment start; local
          conditions may differ. The model scales 10 m forecast wind to about
          two thirds at handlebar height. Forecast-error assumptions grow with
          lead time (about ±1 m/s and ±15° now, ±2 m/s and ±30° two days out).
          Weather symbols, night shading and rain bands follow the
          provider&apos;s WMO weather code and daylight flag.
        </p>
        {forecast && (
          <p>
            Retrieved {label(forecast.retrievedAt)} · {timeZone}. Stored in
            memory only.
          </p>
        )}
        <a href="https://open-meteo.com/en/terms">Provider terms and privacy</a>
      </details>
    </section>
  );
}
