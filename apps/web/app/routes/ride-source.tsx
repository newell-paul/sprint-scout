"use client";
import { useId, useState } from "react";
import { alongTrack, type Coordinate } from "@scout/analysis/track";
import { gpxLimits, parseGpx } from "@scout/application/gpx";

export type Ride = { track: Coordinate[]; along: number[]; fileName: string };

const km = (metres: number) => `${(metres / 1000).toFixed(2)} km`;

// A ride is read in this browser and never stored: only the segment the rider
// saves from it is kept, through the usual save.
export default function RideSource({
  ride,
  start,
  finish,
  onOpen,
  onPick,
  onClose,
}: {
  ride: Ride | null;
  start: number | null;
  finish: number | null;
  onOpen: (ride: Ride) => void;
  onPick: (start: number, finish: number) => void;
  onClose: () => void;
}) {
  const inputId = useId();
  const [ownRecording, setOwnRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function open(file: File) {
    setBusy(true);
    setMessage("");
    try {
      if (file.size > gpxLimits.bytes)
        throw new Error("GPX file is missing or larger than 25 MB.");
      const parsed = parseGpx(await file.text());
      const track = parsed.points.map<Coordinate>((p) => [p.lon, p.lat]);
      onOpen({ track, along: alongTrack(track), fileName: file.name });
      setMessage(
        `${file.name} is open. It is read in this browser only and is not kept.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not read that file.",
      );
    } finally {
      setBusy(false);
    }
  }
  const last = ride ? ride.track.length - 1 : 0;
  const shownStart = start ?? 0;
  const shownFinish = finish ?? last;
  return (
    <details className="ride-source" data-testid="ride-source">
      <summary>From a ride</summary>
      <p>
        Use a GPX of your own ride: from your bike computer or its app, or
        Strava&apos;s Export GPX or Export Original on your own activity. Then
        tap the start and the finish on the ride.
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
      <label className="efforts-import" htmlFor={inputId}>
        <span className="button-like" aria-disabled={!ownRecording || busy}>
          Open GPX ride
        </span>
        <input
          id={inputId}
          type="file"
          accept=".gpx,application/gpx+xml"
          disabled={!ownRecording || busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void open(file);
          }}
        />
      </label>
      {ride && (
        <div className="ride-picks">
          <label>
            Segment start{" "}
            <input
              type="range"
              min={0}
              max={last}
              value={shownStart}
              aria-valuetext={km(ride.along[shownStart]!)}
              onChange={(event) =>
                onPick(
                  Math.min(Number(event.target.value), shownFinish - 1),
                  shownFinish,
                )
              }
            />{" "}
            <span aria-hidden="true">{km(ride.along[shownStart]!)}</span>
          </label>
          <label>
            Segment finish{" "}
            <input
              type="range"
              min={0}
              max={last}
              value={shownFinish}
              aria-valuetext={km(ride.along[shownFinish]!)}
              onChange={(event) =>
                onPick(
                  shownStart,
                  Math.max(Number(event.target.value), shownStart + 1),
                )
              }
            />{" "}
            <span aria-hidden="true">{km(ride.along[shownFinish]!)}</span>
          </label>
          <button
            type="button"
            onClick={() => {
              onClose();
              setMessage("");
            }}
          >
            Close ride
          </button>
        </div>
      )}
      <small className="ride-status" role="status">
        {message}
      </small>
    </details>
  );
}
