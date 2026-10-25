import { destination } from "@turf/destination";
import { prepareGeometry, type Geometry } from "@scout/analysis";
import { fetchOpenMeteo } from "./open-meteo-fetch";

export const terrainProfileVersion = "glo90-profile-v1" as const;
export type TerrainProfile = {
  version: typeof terrainProfileVersion;
  geometryKey: string;
  retrievedAt: string;
  source: "Open-Meteo / Copernicus DEM GLO-90 2021";
  elevationsM: number[];
};
export type TerrainSampling = {
  geometry: Geometry;
  points: [number, number][];
  distancesM: number[];
};

export function sampleTerrain(points: unknown): TerrainSampling {
  const geometry = prepareGeometry({ type: "LineString", coordinates: points });
  if (geometry.lengthM < 90)
    throw new Error(
      "Segment is shorter than the 90 m elevation grid; terrain estimate unavailable.",
    );
  const count = Math.ceil(geometry.lengthM / 100);
  if (count > 1000)
    throw new Error("Terrain preview supports segments up to 100 km.");
  const distancesM = Array.from(
    { length: count + 1 },
    (_, index) => (geometry.lengthM * index) / count,
  );
  let legIndex = 0;
  let offset = 0;
  const samples = distancesM.map((distanceM): [number, number] => {
    while (
      legIndex < geometry.legs.length - 1 &&
      distanceM > offset + geometry.legs[legIndex]!.distanceM
    ) {
      offset += geometry.legs[legIndex]!.distanceM;
      legIndex++;
    }
    const leg = geometry.legs[legIndex]!;
    if (distanceM === geometry.lengthM) return [...leg.end];
    const coordinate = destination(
      leg.start,
      Math.max(0, distanceM - offset),
      leg.bearingDegrees,
      { units: "meters" },
    ).geometry.coordinates;
    return [((coordinate[0]! + 540) % 360) - 180, coordinate[1]!];
  });
  return { geometry, points: samples, distancesM };
}

export function validTerrainProfile(
  value: unknown,
  points: unknown,
): value is TerrainProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<TerrainProfile>;
  if (
    profile.version !== terrainProfileVersion ||
    profile.geometryKey !== JSON.stringify(points) ||
    profile.source !== "Open-Meteo / Copernicus DEM GLO-90 2021" ||
    typeof profile.retrievedAt !== "string" ||
    !Number.isFinite(Date.parse(profile.retrievedAt)) ||
    !Array.isArray(profile.elevationsM) ||
    profile.elevationsM.length > 1001 ||
    !profile.elevationsM.every(
      (height) =>
        typeof height === "number" &&
        Number.isFinite(height) &&
        height >= -500 &&
        height <= 9000,
    )
  )
    return false;
  try {
    return profile.elevationsM.length === sampleTerrain(points).points.length;
  } catch {
    return false;
  }
}

export function prepareTerrain(points: unknown, profile: TerrainProfile) {
  if (!validTerrainProfile(profile, points))
    throw new Error(
      "Elevation is missing, invalid or belongs to different segment geometry. Reload terrain.",
    );
  const sampling = sampleTerrain(points);
  const smoothedM = profile.elevationsM.map((height, index, heights) =>
    index === 0 || index === heights.length - 1
      ? height
      : (heights[index - 1]! + 2 * height + heights[index + 1]!) / 4,
  );
  const at = (distanceM: number) => {
    const fractional = Math.min(
      smoothedM.length - 1,
      Math.max(
        0,
        (distanceM / sampling.geometry.lengthM) * (smoothedM.length - 1),
      ),
    );
    const lower = Math.min(smoothedM.length - 2, Math.floor(fractional));
    return (
      smoothedM[lower]! +
      (smoothedM[lower + 1]! - smoothedM[lower]!) * (fractional - lower)
    );
  };
  let offset = 0;
  let sampleIndex = 1;
  const legs = sampling.geometry.legs.flatMap((leg) => {
    const end = offset + leg.distanceM;
    const cuts: number[] = [];
    while (
      sampleIndex < sampling.distancesM.length &&
      sampling.distancesM[sampleIndex]! <= offset + 1e-6
    )
      sampleIndex++;
    while (
      sampleIndex < sampling.distancesM.length &&
      sampling.distancesM[sampleIndex]! < end - 1e-6
    ) {
      cuts.push(sampling.distancesM[sampleIndex]!);
      sampleIndex++;
    }
    cuts.push(end);
    return cuts.map((next) => {
      const horizontalM = next - offset;
      const riseM = at(next) - at(offset);
      offset = next;
      const grade = riseM / horizontalM;
      if (Math.abs(grade) > 0.3)
        throw new Error(
          "Elevation implies a grade over 30%; terrain estimate unavailable. Check segment geometry and elevation.",
        );
      return {
        distanceM: Math.hypot(horizontalM, riseM),
        bearingDegrees: leg.bearingDegrees,
        grade,
      };
    });
  });
  let ascentM = 0;
  let descentM = 0;
  smoothedM.forEach((height, index) => {
    if (index === 0) return;
    const difference = height - smoothedM[index - 1]!;
    ascentM += Math.max(0, difference);
    descentM += Math.max(0, -difference);
  });
  return {
    ...sampling,
    smoothedM,
    legs,
    ascentM,
    descentM,
    distanceM: legs.reduce((total, leg) => total + leg.distanceM, 0),
    maxGradePct: Math.max(...legs.map((leg) => Math.abs(leg.grade))) * 100,
  };
}

export async function loadTerrain(
  points: unknown,
  confirmed: boolean,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
  now = new Date(),
): Promise<TerrainProfile> {
  if (!confirmed)
    throw new Error(
      "Confirm sharing sampled segment coordinates for elevation first.",
    );
  const sampling = sampleTerrain(points);
  const elevationsM: number[] = [];
  for (let offset = 0; offset < sampling.points.length; offset += 100) {
    signal.throwIfAborted();
    const batch = sampling.points.slice(offset, offset + 100);
    const url = new URL("https://api.open-meteo.com/v1/elevation");
    url.search = new URLSearchParams({
      latitude: batch.map((point) => point[1].toFixed(6)).join(","),
      longitude: batch.map((point) => point[0].toFixed(6)).join(","),
    }).toString();
    const input = await fetchOpenMeteo(url, {
      service: "Elevation service",
      body: "Elevation",
      maxBytes: 20_000,
      signal,
      fetcher,
    });
    const values =
      input && typeof input === "object"
        ? (input as Record<string, unknown>).elevation
        : null;
    if (
      !Array.isArray(values) ||
      values.length !== batch.length ||
      !values.every(
        (height) =>
          typeof height === "number" &&
          Number.isFinite(height) &&
          height >= -500 &&
          height <= 9000,
      )
    )
      throw new Error(
        "Elevation is incomplete or invalid. Terrain estimate unavailable.",
      );
    elevationsM.push(...values);
  }
  signal.throwIfAborted();
  const profile: TerrainProfile = {
    version: terrainProfileVersion,
    geometryKey: JSON.stringify(points),
    retrievedAt: now.toISOString(),
    source: "Open-Meteo / Copernicus DEM GLO-90 2021",
    elevationsM,
  };
  prepareTerrain(points, profile);
  return profile;
}
