"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  loadTerrain,
  prepareTerrain,
  type TerrainProfile,
} from "@scout/application/terrain";
import type { DrawnRoute } from "./library";
import type { SpeedUnit } from "../components/speed";

export default function TerrainPanel({
  route,
  unit,
  onChange,
  onAutoChange,
}: {
  route: DrawnRoute;
  unit: SpeedUnit;
  onChange: (
    terrain: TerrainProfile | null,
    mode: "flat" | "terrain",
  ) => boolean;
  onAutoChange: (auto: boolean) => boolean;
}) {
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const active = useRef<AbortController | null>(null);
  const attempted = useRef<string | null>(null);
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
      attempted.current = null;
    },
    [],
  );
  const prepared = useMemo(() => {
    if (!route.terrain)
      return { profile: null, error: "No usable elevation loaded." };
    try {
      return {
        profile: prepareTerrain(route.points, route.terrain),
        error: "",
      };
    } catch (cause) {
      return {
        profile: null,
        error:
          cause instanceof Error ? cause.message : "Elevation unavailable.",
      };
    }
  }, [route.points, route.terrain]);
  const mode = route.terrainMode ?? "flat";
  const auto = route.terrainAuto === true;
  const profile = prepared.profile;
  const length = (distanceM: number) =>
    unit === "mph"
      ? `${(distanceM / 1609.344).toFixed(2)} mi`
      : `${(distanceM / 1000).toFixed(2)} km`;
  const height = (heightM: number) =>
    unit === "mph"
      ? `${Math.round(heightM / 0.3048)} ft`
      : `${Math.round(heightM)} m`;
  const minimum = profile ? Math.min(...profile.smoothedM) : 0;
  const maximum = profile ? Math.max(...profile.smoothedM) : 0;
  const path = profile?.smoothedM
    .map(
      (elevation, index) =>
        `${index === 0 ? "M" : "L"}${10 + (profile.distancesM[index]! / profile.geometry.lengthM) * 580},${75 - ((elevation - minimum) / Math.max(10, maximum - minimum)) * 60}`,
    )
    .join(" ");
  const load = useCallback(async () => {
    if (!(consent || auto) || loading) return;
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setMessage("");
    const timer = window.setTimeout(() => controller.abort(), 20000);
    try {
      const terrain = await loadTerrain(
        route.points,
        (consent || auto) && route.confirmed,
        controller.signal,
      );
      if (controller.signal.aborted || active.current !== controller) return;
      setMessage(
        onChange(terrain, "terrain")
          ? "Terrain loaded and saved in this browser."
          : "Could not save terrain. The segment may have changed or storage may be unavailable.",
      );
    } catch (cause) {
      if (active.current === controller)
        setMessage(
          controller.signal.aborted
            ? "Elevation request cancelled or timed out. Previous model selection is unchanged."
            : cause instanceof Error
              ? cause.message
              : "Elevation unavailable. Previous model selection is unchanged.",
        );
    } finally {
      window.clearTimeout(timer);
      if (active.current === controller) active.current = null;
      setLoading(false);
    }
  }, [auto, consent, loading, onChange, route.confirmed, route.points]);
  // One automatic elevation request per geometry once the owner has opted in;
  // a failed attempt waits for the next edit or a manual Load terrain.
  const geometryKey = JSON.stringify(route.points);
  // Deferred a tick so a synchronous unmount (React strict mode) sends nothing.
  useEffect(() => {
    if (!auto || mode !== "terrain" || route.terrain || loading) return;
    if (attempted.current === geometryKey) return;
    const timer = window.setTimeout(() => {
      attempted.current = geometryKey;
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [auto, mode, route.terrain, loading, geometryKey, load]);
  return (
    <section className="terrain-panel" aria-label="Segment terrain">
      <div className="terrain-heading">
        <h3>Terrain · {mode === "terrain" ? "Enabled" : "Flat-road mode"}</h3>
        <button
          type="button"
          onClick={() => void load()}
          disabled={!consent || loading}
        >
          {loading
            ? "Loading elevation…"
            : route.terrain
              ? "Reload terrain"
              : "Load terrain"}
        </button>
      </div>
      <label className="terrain-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />{" "}
        Share sampled coordinates along this segment with Open-Meteo for
        elevation.
      </label>
      <label className="terrain-consent">
        <input
          type="checkbox"
          checked={auto}
          disabled={!consent && !auto}
          onChange={(event) => {
            if (!onAutoChange(event.target.checked))
              setMessage("Could not save the automatic terrain setting.");
          }}
        />{" "}
        Reload terrain automatically after this segment is edited.
      </label>
      {profile ? (
        <>
          <div
            className="terrain-modes"
            role="group"
            aria-label="Estimate model"
          >
            <button
              type="button"
              aria-pressed={mode === "flat"}
              disabled={loading}
              onClick={() => {
                if (!onChange(route.terrain!, "flat"))
                  setMessage("Could not save model selection.");
              }}
            >
              Flat road
            </button>
            <button
              type="button"
              aria-pressed={mode === "terrain"}
              disabled={loading}
              onClick={() => {
                if (!onChange(route.terrain!, "terrain"))
                  setMessage("Could not save model selection.");
              }}
            >
              Terrain
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (onChange(null, "flat")) {
                  if (auto) onAutoChange(false);
                  setMessage("Elevation removed; flat-road mode selected.");
                  setConsent(false);
                } else setMessage("Could not remove elevation.");
              }}
            >
              Remove elevation
            </button>
          </div>
          <svg
            className="elevation-profile"
            viewBox="0 0 600 90"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Smoothed elevation profile from Start to Finish. Ascent ${height(profile.ascentM)}, descent ${height(profile.descentM)}.`}
          >
            <path
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="terrain-stats">
            <span>Start {height(profile.smoothedM[0]!)}</span>
            <span>
              ↑ {height(profile.ascentM)} · ↓ {height(profile.descentM)}
            </span>
            <span>Finish {height(profile.smoothedM.at(-1)!)}</span>
          </div>
          <p>
            Length {length(profile.geometry.lengthM)} · Steepest modelled grade{" "}
            {profile.maxGradePct.toFixed(1)}% · Smoothed, not surveyed road
            elevation.
          </p>
          <details>
            <summary>Elevation samples & source</summary>
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Elevation samples table"
            >
              <table>
                <caption>
                  Directed samples · distance from Start · raw and smoothed
                  elevation
                </caption>
                <thead>
                  <tr>
                    <th>Distance</th>
                    <th>Raw elevation</th>
                    <th>Model elevation</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.distancesM.map((distanceM, index) => (
                    <tr key={index}>
                      <td>{length(distanceM)}</td>
                      <td>{height(route.terrain!.elevationsM[index]!)}</td>
                      <td>{height(profile.smoothedM[index]!)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Retrieved {new Date(route.terrain!.retrievedAt).toLocaleString()}.
              Stored with this segment until removed. Editing geometry
              invalidates elevation.
            </p>
          </details>
        </>
      ) : (
        <p>
          {prepared.error}{" "}
          {mode === "terrain"
            ? "Terrain estimates are unavailable. Load terrain or explicitly select flat-road mode."
            : "Current estimates assume flat road; unknown elevation is not evidence of a flat segment."}
          {mode === "terrain" && (
            <button type="button" onClick={() => onChange(null, "flat")}>
              Use flat-road estimate
            </button>
          )}
        </p>
      )}
      <details className="terrain-notes">
        <summary>Elevation source and limits</summary>
        <p className="terrain-note">
          90 m surface grid: bridges, trees and short hills may be wrong. Steady
          effort; acceleration, braking and detailed local airflow excluded.
          Range covers assumed wind errors only, not elevation errors. Not a
          validated personal prediction.
        </p>
        <small>
          <a href="https://open-meteo.com/en/docs/elevation-api">Open-Meteo</a>{" "}
          /{" "}
          <a href="https://doi.org/10.5270/ESA-c5d3d65">
            Copernicus DEM GLO-90 (2021)
          </a>{" "}
          · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>{" "}
          · Resampled and smoothed. Requests may be logged for 90 days;{" "}
          <a href="https://open-meteo.com/en/terms">terms & privacy</a>.
          Elevation © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH
          2014–2018, provided under COPERNICUS by the European Union and ESA;
          all rights reserved. The organisations in charge of the Copernicus
          programme do not incur any liability for any use of the Copernicus
          DEM.
        </small>
      </details>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
