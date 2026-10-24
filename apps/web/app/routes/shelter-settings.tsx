"use client";
import { useState } from "react";
import { shelterPresets, type Shelter } from "@scout/application/shelter";

function ShelterIcon({ level }: { level: Shelter }) {
  return (
    <svg viewBox="0 0 48 32" aria-hidden="true" focusable="false">
      {level === "exposed" ? (
        <path d="M6 10h24c8 0 8-8 2-8 M6 17h32 M6 24h20c8 0 8 7 2 7" />
      ) : (
        (level === "dense" ? [12, 24, 36] : [24]).map((centre) => (
          <g key={centre} transform={`translate(${centre} 0)`}>
            <path d="M0 3 -8 15h4l-7 10h22L4 15h4L0 3Z M0 25v5" />
          </g>
        ))
      )}
    </svg>
  );
}

export default function ShelterSettings({
  value,
  onChange,
}: {
  value: Shelter;
  onChange: (value: Shelter) => boolean;
}) {
  const [error, setError] = useState("");
  return (
    <section className="shelter-settings" aria-label="Manual wind shelter">
      <h3>Assumed shelter</h3>
      <div className="shelter-choices" role="group" aria-label="Shelter level">
        {(Object.keys(shelterPresets) as Shelter[]).map((level) => (
          <button
            key={level}
            type="button"
            aria-pressed={value === level}
            onClick={() =>
              setError(
                onChange(level)
                  ? ""
                  : "Could not save shelter. Existing setting is unchanged.",
              )
            }
          >
            <ShelterIcon level={level} />
            <strong>{shelterPresets[level].label}</strong>
            <span>
              {Math.round((1 - shelterPresets[level].windFactor) * 100)}% wind
              reduction
            </span>
          </button>
        ))}
      </div>
      <details className="shelter-notes">
        <summary>How shelter is applied</summary>
        <p>
          Manual what-if setting for the whole segment, saved in this browser.
          Reduces both headwind penalty and tailwind benefit. These percentages
          are assumptions—not measured tree protection.
        </p>
        <small>
          Forecast wind and gusts stay unchanged. The time range includes the
          exposed scenario, not validated shelter confidence. Gaps, wind
          direction, foliage and turbulence are not modelled.
        </small>
      </details>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
