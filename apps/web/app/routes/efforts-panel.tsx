"use client";
import { useEffect, useId, useRef, useState } from "react";
import { matchEfforts } from "@scout/analysis/effort-match";
import type { Rider } from "@scout/analysis";
import { parseGpx, type GpxTrack } from "@scout/application/gpx";
import {
  loadArchiveWind,
  splitDates,
  utcDate,
  windAt,
} from "@scout/application/archive-wind";
import {
  describeRouteWind,
  estimateRouteRideEffect,
} from "@scout/application/route-wind";
import { formatDuration } from "../components/time";
import { formatSpeed, type SpeedUnit } from "../components/speed";
import {
  needsWind,
  newId,
  effortLimits,
  type DrawnRoute,
  type EffortWind,
  type RouteEffort,
} from "./library";

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const skippedNote = ({ skipped, zoneless }: GpxTrack) =>
  skipped === 0
    ? ""
    : ` ${skipped} track ${skipped === 1 ? "point was" : "points were"} skipped for a missing or out-of-order time or position${zoneless > 0 ? `; ${zoneless} had a time with no zone` : ""}.`;
export default function EffortsPanel({
  route,
  rider,
  unit,
  onChange,
}: {
  route: DrawnRoute;
  rider: Rider;
  unit: SpeedUnit;
  onChange: (efforts: RouteEffort[]) => boolean;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [ownRecording, setOwnRecording] = useState(false);
  const [windConsent, setWindConsent] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);
  const active = useRef<AbortController | null>(null);
  // An import or archive load finishes after an await; it must build on the
  // efforts stored then, not the ones it started with, or a removal reverts.
  const latest = useRef(route.efforts);
  latest.current = route.efforts;
  const inputId = useId();
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    [],
  );
  const efforts = [...(route.efforts ?? [])].sort((a, b) =>
    a.startedAt < b.startedAt ? 1 : -1,
  );
  const best = efforts.reduce<RouteEffort | null>(
    (fastest, effort) =>
      fastest === null || effort.elapsedSeconds < fastest.elapsedSeconds
        ? effort
        : fastest,
    null,
  );
  const missingWind = efforts.filter(needsWind);
  const geometryKey = JSON.stringify(route.points);
  async function importFile(file: File) {
    setBusy(true);
    setMessage("");
    try {
      const track = parseGpx(await file.text());
      const matches = matchEfforts(route.points, track.points);
      if (matches.length === 0) {
        setMessage(
          `No traversal of this segment found in ${file.name}. The ride must pass the start, follow the segment in its drawn direction and reach the finish.${skippedNote(track)}`,
        );
        return;
      }
      const known = new Set(
        (latest.current ?? []).map((effort) => effort.startedAt),
      );
      const fresh = matches
        .filter((match) => !known.has(match.startedAt))
        .map<RouteEffort>((match) => ({
          id: newId(),
          startedAt: match.startedAt,
          elapsedSeconds: match.elapsedSeconds,
          source: "gpx",
          fileName: file.name.slice(0, 200),
          geometryKey,
          maxDeviationM: match.maxDeviationM,
          sampleGapSeconds: match.sampleGapSeconds,
          importedAt: new Date().toISOString(),
        }));
      const merged = [...(latest.current ?? []), ...fresh];
      if (merged.length > effortLimits.perRoute) {
        setMessage(
          `This segment already holds ${effortLimits.perRoute} efforts. Remove some before importing more.`,
        );
        return;
      }
      if (fresh.length === 0) {
        setMessage(
          `${matches.length === 1 ? "That effort is" : "Those efforts are"} already saved for this segment.`,
        );
        return;
      }
      if (onChange(merged))
        setMessage(
          `${fresh.length} ${fresh.length === 1 ? "effort" : "efforts"} added from ${file.name}. The file was read in this browser only.${skippedNote(track)}`,
        );
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "Could not read that file.",
      );
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  async function loadWind() {
    if (!windConsent || busy || missingWind.length === 0) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setMessage("");
    let timedOut = false;
    const timer = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 20000);
    // One press loads as many date runs as the archive limit allows; the rest
    // stay pending and are reported so the next press continues.
    const { now: dates, later } = splitDates(
      missingWind.map((effort) => utcDate(effort.startedAt)),
    );
    const loading = missingWind.filter((effort) =>
      dates.includes(utcDate(effort.startedAt)),
    ).length;
    try {
      const archive = await loadArchiveWind(
        { point: route.points[0], dates, consent: windConsent },
        controller.signal,
      );
      if (controller.signal.aborted) {
        if (timedOut) setMessage("Past wind timed out; try again.");
        return;
      }
      const updated = (latest.current ?? []).map((effort) => {
        if (!needsWind(effort) || !dates.includes(utcDate(effort.startedAt)))
          return effort;
        const hour = windAt(archive.hours, effort.startedAt);
        const wind: EffortWind | null = hour
          ? {
              speedMps: hour.speedMps,
              fromDegrees: hour.fromDegrees,
              gustMps: hour.gustMps,
              precipitationMm: hour.precipitationMm,
              retrievedAt: archive.retrievedAt,
              source: "open-meteo-archive",
            }
          : null;
        return { ...effort, wind };
      });
      if (onChange(updated))
        setMessage(
          `Past wind saved for ${loading} ${loading === 1 ? "effort" : "efforts"} from the Open-Meteo archive.` +
            (later.length > 0
              ? ` ${missingWind.length - loading} more on other dates still need wind; press Load past wind again.`
              : ""),
        );
    } catch (cause) {
      if (timedOut) setMessage("Past wind timed out; try again.");
      else if (!controller.signal.aborted)
        setMessage(
          cause instanceof Error ? cause.message : "Could not load past wind.",
        );
    } finally {
      window.clearTimeout(timer);
      if (active.current === controller) active.current = null;
      setBusy(false);
    }
  }
  const when = (iso: string) => {
    const d = new Date(iso);
    const two = (n: number) => String(n).padStart(2, "0");
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${two(d.getHours())}:${two(d.getMinutes())}`;
  };
  const windCell = (effort: RouteEffort) => {
    if (effort.wind === undefined) return "Not loaded";
    if (effort.wind === null || effort.wind.speedMps === null)
      return "Unavailable";
    const hour = {
      at: effort.startedAt,
      speedMps: effort.wind.speedMps,
      fromDegrees: effort.wind.fromDegrees,
    };
    const model = estimateRouteRideEffect(
      route.points,
      hour,
      undefined,
      rider,
      route.terrainMode === "terrain" ? (route.terrain ?? null) : undefined,
      route.shelter ?? "exposed",
    );
    const seconds = model
      ? Math.round(model.windTimeS - model.calmTimeS)
      : null;
    const delta =
      seconds === null
        ? ""
        : ` · model ${seconds > 0 ? "+" : seconds < 0 ? "−" : "±"}${Math.abs(seconds)} s`;
    return `${describeRouteWind(route.points, hour)} · ${formatSpeed(effort.wind.speedMps, unit)}${delta}`;
  };
  return (
    <section
      className="efforts-panel"
      aria-labelledby={`${inputId}-heading`}
      data-testid="efforts-panel"
    >
      <div className="terrain-heading">
        <h3 id={`${inputId}-heading`}>
          Your efforts
          {best ? ` · Best ${formatDuration(best.elapsedSeconds)}` : ""}
        </h3>
        <label className="efforts-import" htmlFor={inputId}>
          <span className="button-like" aria-disabled={!ownRecording || busy}>
            Import GPX ride
          </span>
          <input
            ref={input}
            id={inputId}
            type="file"
            accept=".gpx,application/gpx+xml"
            disabled={!ownRecording || busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importFile(file);
            }}
          />
        </label>
      </div>
      <p>
        Times come from your own recorded rides, matched against this segment in
        this browser. Nothing is uploaded.
      </p>
      <label className="terrain-consent">
        <input
          type="checkbox"
          checked={ownRecording}
          onChange={(event) => setOwnRecording(event.target.checked)}
        />{" "}
        The file I import is my own device recording and I have the right to use
        it here.
      </label>
      {efforts.length > 0 && (
        <>
          <label className="terrain-consent">
            <input
              type="checkbox"
              checked={windConsent}
              onChange={(event) => setWindConsent(event.target.checked)}
            />{" "}
            Share this segment&apos;s start coordinate and the dates of these
            efforts with Open-Meteo for past wind.
          </label>
          <div className="terrain-modes">
            <button
              type="button"
              disabled={!windConsent || busy || missingWind.length === 0}
              onClick={() => void loadWind()}
            >
              {busy ? "Loading…" : "Load past wind"}
            </button>
            <small>
              {missingWind.length === 0
                ? "Past wind loaded for every effort."
                : `${missingWind.length} ${missingWind.length === 1 ? "effort" : "efforts"} without wind.`}
            </small>
          </div>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Efforts table"
          >
            <table>
              <caption className="sr-only">
                Matched efforts on this segment
              </caption>
              <thead>
                <tr>
                  <th scope="col">Ride</th>
                  <th scope="col">Time</th>
                  <th scope="col">Wind that hour</th>
                  <th scope="col">Track fit</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {efforts.map((effort) => (
                  <tr
                    key={effort.id}
                    data-testid="effort-row"
                    aria-current={effort.id === best?.id ? "true" : undefined}
                  >
                    <th scope="row">
                      <time dateTime={effort.startedAt}>
                        {when(effort.startedAt)}
                      </time>
                      <small>{effort.fileName}</small>
                    </th>
                    <td data-testid="effort-time">
                      {formatDuration(effort.elapsedSeconds)}
                    </td>
                    <td data-testid="effort-wind">{windCell(effort)}</td>
                    <td>
                      ±{Math.round(effort.maxDeviationM)} m
                      {effort.sampleGapSeconds > 5
                        ? ` · ${effort.sampleGapSeconds}s gaps`
                        : ""}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() =>
                          onChange(
                            (route.efforts ?? []).filter(
                              (item) => item.id !== effort.id,
                            ),
                          )
                        }
                        aria-label={`Remove effort from ${when(effort.startedAt)}`}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
