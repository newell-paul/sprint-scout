"use client";
import { useMemo } from "react";
import { elevationProfile } from "@scout/analysis/elevation";
import type { Point } from "./library";
import type { SpeedUnit } from "../components/speed";

// Recorded heights from the rider's GPX file, drawn as they are. Display only.
export default function ElevationSection({
  points,
  heightsM,
  unit,
}: {
  points: Point[];
  heightsM: number[];
  unit: SpeedUnit;
}) {
  const profile = useMemo(
    () => elevationProfile(points, heightsM),
    [points, heightsM],
  );
  const feet = unit === "mph";
  // The net change is the difference of the two shown values, so the line adds up.
  const shown = (heightM: number) =>
    feet ? Math.round(heightM / 0.3048) : Math.round(heightM * 10) / 10;
  const label = (value: number) =>
    feet ? `${value} ft` : `${value.toFixed(1)} m`;
  const height = (heightM: number) => label(shown(heightM));
  const net = feet
    ? shown(profile.finishM) - shown(profile.startM)
    : Math.round((shown(profile.finishM) - shown(profile.startM)) * 10) / 10;
  const change =
    net === 0
      ? "Level"
      : `${net > 0 ? "Rises" : "Falls"} ${label(Math.abs(net))}`;
  // Never less than 10 m tall, so a few metres of GPS noise don't look like a hill.
  const rangeM = Math.max(10, profile.highestM - profile.lowestM);
  const baseM = (profile.lowestM + profile.highestM) / 2 - rangeM / 2;
  const lengthM = profile.distancesM.at(-1)!;
  const path = heightsM
    .map(
      (heightM, index) =>
        `${index === 0 ? "M" : "L"}${(10 + (profile.distancesM[index]! / lengthM) * 580).toFixed(1)},${(80 - ((heightM - baseM) / rangeM) * 70).toFixed(1)}`,
    )
    .join(" ");
  return (
    <section className="elevation-section" aria-label="Segment elevation">
      <h3>Elevation</h3>
      <svg
        className="elevation-profile"
        viewBox="0 0 600 90"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Elevation profile: start ${height(profile.startM)}, finish ${height(profile.finishM)}, lowest ${height(profile.lowestM)}, highest ${height(profile.highestM)}`}
      >
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <p>
        Start {height(profile.startM)} · Finish {height(profile.finishM)} ·{" "}
        {change}
      </p>
      <small>
        Lowest {height(profile.lowestM)} · Highest {height(profile.highestM)} ·
        Recorded by your GPX file
      </small>
    </section>
  );
}
