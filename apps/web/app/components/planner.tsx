"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  plannerResponse,
  type PlannerResponse,
  type PlannerRequest,
  type PlannerHour,
} from "@scout/contracts";
import { estimateDeparture } from "@scout/application/departure";
import RouteMap from "./route-map";
import HourChart from "./hour-chart";
import RideEffect from "./ride-effect";
import { formatZonedTime } from "./time";
const n = (value: number | null, unit = "m/s") =>
  value === null ? "Unknown" : `${value.toFixed(1)} ${unit}`;
const warnings: Record<string, string> = {
  GUST_THRESHOLD: "Gusts above 10 m/s",
  CROSSWIND_THRESHOLD: "Crosswind above 4 m/s",
  RAIN_THRESHOLD: "Rain above 0.5 mm",
  INCOMPLETE_WEATHER: "Some weather fields are unavailable",
};
const errorLabels: Record<string, string> = {
  GEOMETRY_INVALID: "Route geometry unavailable",
  FORECAST_UNAVAILABLE: "Weather unavailable for this hour",
  OUTSIDE_FORECAST_RANGE: "Outside forecast coverage",
  SOURCE_NOT_PERMITTED: "Source is not permitted",
  RATE_LIMITED: "Provider request limit reached",
};
function Metrics({ row }: { row: PlannerHour }) {
  return (
    <dl className="metrics">
      <div>
        <dt>Tailwind (+) / headwind (−)</dt>
        <dd data-testid="tailwind">{n(row.tailwindMps)}</dd>
      </div>
      <div>
        <dt>Typical crosswind</dt>
        <dd>{n(row.meanAbsCrosswindMps)}</dd>
      </div>
      <div>
        <dt>Maximum gust</dt>
        <dd>{n(row.gustMps)}</dd>
      </div>
      <div>
        <dt>Rain</dt>
        <dd>{n(row.precipitationMm, "mm")}</dd>
      </div>
      <div className="metrics-wide">
        <dt>Estimated ride effect</dt>
        <dd>
          <RideEffect
            speedDeltaMps={row.rideEffect.speedDeltaMps}
            calmSpeedMps={row.rideEffect.calmSpeedMps}
            band={row.rideEffect.band}
            compact
          />
        </dd>
      </div>
    </dl>
  );
}
export default function Planner({ initial }: { initial: PlannerResponse }) {
  const [data, setData] = useState(initial),
    [draft, setDraft] = useState<PlannerRequest>(initial.request),
    [selectedId, setSelectedId] = useState(initial.best[0]?.segmentId ?? ""),
    [attemptAt, setAttemptAt] = useState(initial.best[0]?.attemptAt ?? ""),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [theme, setTheme] = useState<"light" | "dark">("light"),
    [approach, setApproach] = useState("20"),
    [warmup, setWarmup] = useState("10");
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  const selected = data.segments.find((s) => s.id === selectedId),
    rows = data.hourly
      .filter((r) => r.segmentId === selectedId)
      .sort((a, b) => (a.attemptAt < b.attemptAt ? -1 : 1)),
    row = rows.find((r) => r.attemptAt === attemptAt) ?? rows[0];
  const best = data.best
    .map((key) =>
      data.hourly.find(
        (r) => r.segmentId === key.segmentId && r.attemptAt === key.attemptAt,
      )!,
    )
    .filter(Boolean);
  function select(id: string, at?: string) {
    setSelectedId(id);
    const available = data.hourly.filter((r) => r.segmentId === id);
    setAttemptAt(
      at ??
        available.find((r) => r.attemptAt === attemptAt)?.attemptAt ??
        data.best.find((r) => r.segmentId === id)?.attemptAt ??
        available[0]?.attemptAt ??
        "",
    );
  }
  async function refresh(event?: FormEvent) {
    event?.preventDefault();
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(draft)) {
      if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
      else if (value !== undefined) params.set(key, value);
    }
    try {
      const response = await fetch(`/api/planner?${params}`, {
        signal: controller.signal,
      });
      const value: unknown = await response.json();
      if (!response.ok) {
        const code = (value as { error?: string }).error;
        throw new Error(
          code === "AMBIGUOUS_LOCAL_TIME"
            ? "That local time occurs twice. Choose the earlier or later occurrence below."
            : code === "NONEXISTENT_LOCAL_TIME"
              ? "That local time does not exist because clocks move forward. Choose another time."
              : "Check the date, time window and IANA time zone.",
        );
      }
      const next = plannerResponse.parse(value);
      if (controller.signal.aborted) return;
      setData(next);
      const id = next.best.some((r) => r.segmentId === selectedId)
        ? selectedId
        : (next.best[0]?.segmentId ?? "");
      setSelectedId(id);
      setAttemptAt(
        next.hourly.find((r) => r.segmentId === id && r.attemptAt === attemptAt)
          ?.attemptAt ??
          next.best.find((r) => r.segmentId === id)?.attemptAt ??
          "",
      );
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error && e.message.startsWith("That local")
            ? e.message
            : e instanceof Error && e.message.startsWith("Check")
              ? e.message
              : "Could not load conditions. Your previous results have not been replaced. Retry when ready.",
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  let departure: ReturnType<typeof estimateDeparture> | null = null,
    departureError = "";
  if (row) {
    try {
      if (!approach.trim() || !warmup.trim())
        throw new Error("Enter both durations.");
      departure = estimateDeparture(
        row.attemptAt,
        Number(approach),
        Number(warmup),
      );
    } catch (e) {
      departureError = e instanceof Error ? e.message : "Invalid durations";
    }
  }
  return (
    <div className="planner" data-theme={theme}>
      <a className="skip-link" href="#results">
        Skip to results
      </a>
      <header className="topbar">
        <a
          className="brand"
          href="/"
          aria-label="Segment and wind planner home"
        >
          <span aria-hidden="true" className="brand-icon">
            ↗
          </span>{" "}
          SEGMENT / WIND
        </a>
        <div className="top-actions">
          <span className="private-label">PERSONAL PLANNER</span>
          <button
            className="quiet"
            onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
          >
            {theme === "light" ? "Dark theme" : "Light theme"}
          </button>
        </div>
      </header>
      <main>
        <div className="intro">
          <div>
            <p className="eyebrow">THE NEXT GOOD WINDOW</p>
            <h1>Find your tailwind.</h1>
            <p className="lede">
              Compare the wind along your routes, then choose when to ride.
            </p>
          </div>
          <div className="coverage">
            <span className="status-dot" /> SYNTHETIC FORECAST
            <br />
            <strong>8–9 September 2026</strong>
            <small>Fixed demo clock · 8 Sep, 12:00 UTC</small>
          </div>
        </div>
        <form
          onSubmit={refresh}
          className="controls panel"
          aria-label="Riding window"
        >
          <div className="control-grid">
            <label>
              Ride date
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                required
              />
            </label>
            <label>
              From
              <input
                type="time"
                value={draft.startTime}
                onChange={(e) =>
                  setDraft({ ...draft, startTime: e.target.value })
                }
                required
              />
            </label>
            <label>
              Until
              <input
                type="time"
                value={draft.endTime}
                onChange={(e) =>
                  setDraft({ ...draft, endTime: e.target.value })
                }
                required
              />
            </label>
            <label>
              Time zone
              <input
                list="zones"
                value={draft.timeZone}
                onChange={(e) =>
                  setDraft({ ...draft, timeZone: e.target.value })
                }
                required
                maxLength={80}
              />
              <datalist id="zones">
                <option value="Europe/London" />
                <option value="UTC" />
                <option value="America/New_York" />
                <option value="Asia/Kathmandu" />
              </datalist>
            </label>
            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Comparing…" : "Compare windows →"}
            </button>
          </div>
          <div className="filters">
            <fieldset>
              <legend>Selected routes</legend>
              {data.segments.map((s) => (
                <label className="check" key={s.id}>
                  <input
                    type="checkbox"
                    checked={draft.segmentIds.includes(
                      s.id as PlannerRequest["segmentIds"][number],
                    )}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        segmentIds: e.target.checked
                          ? [
                              ...draft.segmentIds,
                              s.id as PlannerRequest["segmentIds"][number],
                            ]
                          : draft.segmentIds.filter((id) => id !== s.id),
                      })
                    }
                  />
                  {s.name}
                </label>
              ))}
            </fieldset>
            <details>
              <summary>Demo conditions &amp; clock changes</summary>
              <div className="extra-controls">
                <label>
                  Weather scenario
                  <select
                    value={draft.scenario}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        scenario: e.target.value as PlannerRequest["scenario"],
                      })
                    }
                  >
                    <option value="normal">Normal synthetic forecast</option>
                    <option value="incomplete">Missing rain and gusts</option>
                    <option value="outage">Forecast unavailable</option>
                    <option value="partial">One route unavailable</option>
                    <option value="stale">Stale forecast</option>
                  </select>
                </label>
                <label>
                  Repeated start time
                  <select
                    value={draft.startChoice ?? ""}
                    onChange={(e) => {
                      const next = { ...draft };
                      if (e.target.value)
                        next.startChoice = e.target.value as
                          "earlier" | "later";
                      else delete next.startChoice;
                      setDraft(next);
                    }}
                  >
                    <option value="">Require a choice if repeated</option>
                    <option value="earlier">Earlier occurrence</option>
                    <option value="later">Later occurrence</option>
                  </select>
                </label>
                <label>
                  Repeated end time
                  <select
                    value={draft.endChoice ?? ""}
                    onChange={(e) => {
                      const next = { ...draft };
                      if (e.target.value)
                        next.endChoice = e.target.value as "earlier" | "later";
                      else delete next.endChoice;
                      setDraft(next);
                    }}
                  >
                    <option value="">Require a choice if repeated</option>
                    <option value="earlier">Earlier occurrence</option>
                    <option value="later">Later occurrence</option>
                  </select>
                </label>
              </div>
            </details>
          </div>
        </form>
        {error ? (
          <div className="notice error" role="alert">
            {error} <button onClick={() => void refresh()}>Retry</button>
          </div>
        ) : null}
        <section
          id="results"
          tabIndex={-1}
          aria-label="Wind opportunities"
          aria-busy={loading}
        >
          <div className="section-title">
            <h2>
              Wind opportunities <span className="count">{best.length}</span>
            </h2>
            <span>
              {formatZonedTime(data.window.startAt, data.request.timeZone)} –{" "}
              {formatZonedTime(data.window.endAt, data.request.timeZone)}
            </span>
          </div>
          {loading ? (
            <div className="loading-layout" role="status">
              <div className="panel skeleton">
                Comparing supplied hourly forecasts…
              </div>
              <div className="panel skeleton" />
            </div>
          ) : (
            <>
              {data.errors.length > 0 ? (
                <div className="notice" role="status">
                  <strong>Some results are unavailable.</strong>{" "}
                  {Array.from(
                    new Set(
                      data.errors.map(
                        (e) =>
                          `${data.segments.find((s) => s.id === e.segmentId)?.name ?? e.segmentId}: ${errorLabels[e.code] ?? e.code}`,
                      ),
                    ),
                  ).join(" · ")}{" "}
                  <button onClick={() => void refresh()}>
                    Retry conditions
                  </button>
                </div>
              ) : null}
              {!best.length ? (
                <div className="empty panel">
                  <h3>
                    {!data.request.segmentIds.length
                      ? "Choose a route to compare"
                      : data.status === "stale"
                        ? "Forecast is stale"
                        : "No covered opportunities"}
                  </h3>
                  <p>
                    {!data.request.segmentIds.length
                      ? "Select one or both synthetic routes above."
                      : data.status === "stale"
                        ? `Last retrieved ${data.retrievedAt}. Stale weather is excluded from ranking.`
                        : "Choose a window within the 8–9 September demo coverage, or retry the forecast."}
                  </p>
                  {data.request.segmentIds.length ? (
                    <button onClick={() => void refresh()}>
                      Retry forecast
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="results-grid">
                  <div className="ranked-list">
                    {best.map((bestRow, i) => {
                      const info = data.segments.find(
                        (s) => s.id === bestRow.segmentId,
                      )!;
                      const current =
                        bestRow.segmentId === selectedId
                          ? (row ?? bestRow)
                          : bestRow;
                      return (
                        <article
                          className={`route-card panel ${info.id === selectedId ? "selected" : ""}`}
                          key={info.id}
                          data-testid={`card-${info.id}`}
                          data-attempt={current.attemptAt}
                        >
                          <button
                            className="card-select"
                            aria-pressed={info.id === selectedId}
                            onClick={() => select(info.id)}
                          >
                            <span className="rank-number">0{i + 1}</span>
                            <span>
                              <span
                                role="heading"
                                aria-level={3}
                                className="route-title"
                              >
                                {info.name}
                              </span>
                              <small>
                                {(info.lengthM / 1000).toFixed(2)} km ·{" "}
                                {info.direction} · Grade unavailable
                              </small>
                            </span>
                            <span aria-hidden="true">↗</span>
                          </button>
                          <div className="best-time">
                            Best attempt{" "}
                            <button
                              onClick={() => select(info.id, bestRow.attemptAt)}
                            >
                              {formatZonedTime(
                                bestRow.attemptAt,
                                bestRow.timeZone,
                              )}
                            </button>
                          </div>
                          <div className="card-current">
                            {info.id === selectedId
                              ? "Viewing"
                              : "Best-hour metrics"}{" "}
                            ·{" "}
                            {formatZonedTime(
                              current.attemptAt,
                              current.timeZone,
                            )}
                          </div>
                          <Metrics row={current} />
                          <div className="index-line">
                            <span>
                              Weather index{" "}
                              <strong>
                                {Math.round(current.weatherIndex)}
                              </strong>
                              /100
                            </span>
                            <span
                              className={
                                current.caution ? "badge caution" : "badge"
                              }
                            >
                              {current.caution
                                ? "Caution"
                                : "No threshold breaches"}
                            </span>
                          </div>
                          <p className="micro">
                            Assistance heuristic · not a PR probability
                          </p>
                          {current.warnings.length ? (
                            <ul className="warning-list">
                              {current.warnings.map((w) => (
                                <li key={w}>{warnings[w] ?? w}</li>
                              ))}
                            </ul>
                          ) : null}
                        </article>
                      );
                    })}
                    <p className="micro">
                      Ordered by each route’s best hour. Viewing another hour
                      keeps the ranking fixed. Warning thresholds are demo
                      settings, not a safety assessment.
                    </p>
                  </div>
                  {row && selected ? (
                    <div className="selected-view">
                      <details className="map-panel panel" open>
                        <summary>Directed route · {selected.name}</summary>
                        <div className="map-head">
                          <span>
                            Viewing{" "}
                            {formatZonedTime(row.attemptAt, row.timeZone)}
                          </span>
                          <span>{selected.direction}</span>
                        </div>
                        <RouteMap row={row} />
                        <div className="legend">
                          <span>
                            <i className="swatch assist" />
                            Solid teal: assistance &gt;0.5 m/s
                          </span>
                          <span>
                            <i className="swatch head" />
                            Dashed amber: headwind &gt;0.5 m/s
                          </span>
                          <span>
                            <i className="swatch neutral" />
                            Grey: near neutral
                          </span>
                          <span>↗ Brown: riding direction</span>
                          <span>↑ Blue: wind travels toward</span>
                        </div>
                      </details>
                      <section
                        className="timeline panel"
                        aria-label="Attempt time"
                      >
                        <div className="section-title">
                          <h3>Compare the hours</h3>
                          <output data-testid="selected-time">
                            {formatZonedTime(row.attemptAt, row.timeZone)}
                          </output>
                        </div>
                        <label className="sr-only" htmlFor="hour">
                          Attempt hour
                        </label>
                        <input
                          id="hour"
                          type="range"
                          min="0"
                          max={Math.max(0, rows.length - 1)}
                          step="1"
                          value={Math.max(
                            0,
                            rows.findIndex(
                              (r) => r.attemptAt === row.attemptAt,
                            ),
                          )}
                          onChange={(e) =>
                            setAttemptAt(
                              rows[Number(e.target.value)]!.attemptAt,
                            )
                          }
                          aria-valuetext={formatZonedTime(
                            row.attemptAt,
                            row.timeZone,
                          )}
                          disabled={rows.length < 2}
                        />
                        <div className="timeline-labels">
                          <span>
                            {formatZonedTime(rows[0]!.attemptAt, row.timeZone)}
                          </span>
                          <span>
                            {formatZonedTime(
                              rows.at(-1)!.attemptAt,
                              row.timeZone,
                            )}
                          </span>
                        </div>
                        <p className="micro">
                          Supplied hourly forecasts only. Changes here use
                          already-loaded results.
                        </p>
                      </section>
                    </div>
                  ) : null}
                </div>
              )}
              {row && selected ? (
                <>
                  <section className="detail-grid">
                    <div className="panel hourly-panel">
                      <div className="section-title">
                        <h2>Along-route wind</h2>
                        <span>{selected.name}</span>
                      </div>
                      <p className="chart-legend">
                        ● Teal: tailwind (+) / headwind (−) · ◆ Amber dashed:
                        crosswind
                      </p>
                      <HourChart
                        rows={rows}
                        attemptAt={row.attemptAt}
                        onSelect={setAttemptAt}
                      />
                      <div
                        className="table-scroll"
                        tabIndex={0}
                        role="region"
                        aria-label="Hourly comparison table"
                      >
                        <table>
                          <caption>Hourly comparison · {row.timeZone}</caption>
                          <thead>
                            <tr>
                              <th scope="col">Attempt</th>
                              <th scope="col">Tailwind</th>
                              <th scope="col">Crosswind</th>
                              <th scope="col">Gust</th>
                              <th scope="col">Rain</th>
                              <th scope="col">Index</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r) => (
                              <tr
                                key={r.attemptAt}
                                data-testid="hour-row"
                                data-attempt={r.attemptAt}
                                aria-current={
                                  r.attemptAt === row.attemptAt
                                    ? "true"
                                    : undefined
                                }
                              >
                                <th scope="row">
                                  <button
                                    onClick={() => setAttemptAt(r.attemptAt)}
                                  >
                                    {formatZonedTime(r.attemptAt, r.timeZone)}
                                    {r.attemptAt === row.attemptAt
                                      ? " · selected"
                                      : ""}
                                  </button>
                                </th>
                                <td>{n(r.tailwindMps)}</td>
                                <td>{n(r.meanAbsCrosswindMps)}</td>
                                <td>{n(r.gustMps)}</td>
                                <td>{n(r.precipitationMm, "mm")}</td>
                                <td>
                                  {Math.round(r.weatherIndex)}
                                  {r.caution ? " · caution" : ""}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <section
                      className="panel departure-panel"
                      aria-label="Departure estimate"
                    >
                      <p className="eyebrow">MAKE TIME FOR THE RIDE</p>
                      <h2>When to leave</h2>
                      <p>
                        Attempt: {formatZonedTime(row.attemptAt, row.timeZone)}
                      </p>
                      <div className="duration-controls">
                        <label>
                          Approach (minutes)
                          <input
                            type="number"
                            min="0"
                            max="360"
                            step="1"
                            value={approach}
                            onChange={(e) => setApproach(e.target.value)}
                          />
                        </label>
                        <label>
                          Warm-up (minutes)
                          <input
                            type="number"
                            min="0"
                            max="120"
                            step="1"
                            value={warmup}
                            onChange={(e) => setWarmup(e.target.value)}
                          />
                        </label>
                      </div>
                      {departure ? (
                        <>
                          <p className="departure-time" data-testid="departure">
                            {formatZonedTime(
                              departure.departureAt,
                              row.timeZone,
                            )}
                          </p>
                          <p className="micro">{departure.assumption}</p>
                        </>
                      ) : (
                        <p role="alert">{departureError}</p>
                      )}
                      <hr />
                      <h3>Performance history unavailable</h3>
                      <p className="micro">
                        Synthetic efforts are not personal records. No speed
                        prediction or PR probability is available.
                      </p>
                    </section>
                  </section>
                  <section
                    className="panel explanation"
                    aria-label="Selected-hour explanation"
                    data-attempt={row.attemptAt}
                  >
                    <h2>What the numbers mean</h2>
                    <p>
                      {n(row.tailwindMps)} average along-route assistance;{" "}
                      {(row.tailwindFraction * 100).toFixed(0)}% of the route
                      exceeds 0.5 m/s tailwind. Maximum crosswind:{" "}
                      {n(row.maxAbsCrosswindMps)}. Worst headwind component:{" "}
                      {n(row.worstHeadwindMps)}. Rain probability:{" "}
                      {n(row.precipitationProbabilityPct, "%")}.
                    </p>
                    <p>{row.limitations}</p>
                    <p className="micro">
                      {row.algorithmVersion} · Index = 100 × clamp((tailwind +
                      5) / 10, 0, 1). Gusts are not added to sustained tailwind.
                    </p>
                    <details>
                      <summary>
                        Route sections — accessible map equivalent
                      </summary>
                      <div
                        className="table-scroll"
                        tabIndex={0}
                        role="region"
                        aria-label="Route sections table"
                      >
                        <table>
                          <caption>
                            {selected.name} ·{" "}
                            {formatZonedTime(row.attemptAt, row.timeZone)} ·
                            GeoJSON longitude, latitude
                          </caption>
                          <thead>
                            <tr>
                              <th scope="col">Section</th>
                              <th scope="col">Start → end</th>
                              <th scope="col">Ride / wind toward</th>
                              <th scope="col">Tailwind</th>
                              <th scope="col">Signed crosswind</th>
                            </tr>
                          </thead>
                          <tbody>
                            {row.legs.map((l, i) => (
                              <tr key={i}>
                                <th scope="row">{i + 1}</th>
                                <td>
                                  {l.start.map((v) => v.toFixed(4)).join(", ")}{" "}
                                  → {l.end.map((v) => v.toFixed(4)).join(", ")}
                                </td>
                                <td>
                                  {Math.round(l.bearingDegrees)}° /{" "}
                                  {l.windBearingDegrees === null
                                    ? "Calm"
                                    : `${Math.round(l.windBearingDegrees)}°`}
                                </td>
                                <td>{n(l.tailwindMps)}</td>
                                <td>{n(l.crosswindMps)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </section>
                </>
              ) : null}
            </>
          )}
        </section>
        <footer className="source-note" aria-label="Weather source">
          <strong>Demo mode · not a current forecast.</strong>
          <p>
            Invented geometry is not a riding recommendation.{" "}
            {data.retrievedAt
              ? `Fixture retrieval: ${formatZonedTime(data.retrievedAt, "UTC")}. Status: ${data.status} at the fixed demo clock.`
              : "No forecast retrieved."}
          </p>
          {data.attribution.map((a) => (
            <p key={a.url}>
              <a href={a.url}>{a.label}</a> ·{" "}
              <a href={a.licenceUrl}>CC BY 4.0</a>
              <br />
              {a.changes}
            </p>
          ))}
        </footer>
      </main>
    </div>
  );
}
