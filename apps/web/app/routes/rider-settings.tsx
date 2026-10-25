"use client";
import { useState } from "react";
import type { RiderInput } from "@scout/analysis";
import { formatSpeed, type SpeedUnit } from "../components/speed";
import { parseRiderField, referenceInput, riderLimits } from "./rider";
const fields: {
  key: keyof RiderInput;
  label: string;
  unitLabel: string;
  step: string;
}[] = [
  { key: "powerW", label: "Sustained power", unitLabel: "W", step: "5" },
  { key: "massKg", label: "Rider + bike", unitLabel: "kg", step: "1" },
  { key: "cdaM2", label: "CdA", unitLabel: "m²", step: "0.01" },
];
const unsaved =
  "Could not save your numbers in this browser; they apply until you close the page.";
export default function RiderSettings({
  input,
  calmSpeedMps,
  unit,
  onChange,
}: {
  input: RiderInput | null;
  calmSpeedMps: number;
  unit: SpeedUnit;
  /** Returns false when the browser could not store the numbers. */
  onChange: (input: RiderInput | null) => boolean;
}) {
  const shown = input ?? referenceInput;
  const [drafts, setDrafts] = useState<Record<keyof RiderInput, string>>({
    powerW: String(shown.powerW),
    massKg: String(shown.massKg),
    cdaM2: String(shown.cdaM2),
  });
  const [message, setMessage] = useState("");
  const apply = (key: keyof RiderInput, value: string) => {
    setDrafts((d) => ({ ...d, [key]: value }));
    const parsed = parseRiderField(key, value);
    const limit = riderLimits[key];
    if (parsed === null) {
      setMessage(
        `${fields.find((f) => f.key === key)!.label} must be ${limit.min} to ${limit.max}.`,
      );
      return;
    }
    setMessage(onChange({ ...shown, [key]: parsed }) ? "" : unsaved);
  };
  const reset = () => {
    setDrafts({
      powerW: String(referenceInput.powerW),
      massKg: String(referenceInput.massKg),
      cdaM2: String(referenceInput.cdaM2),
    });
    setMessage(onChange(null) ? "" : unsaved);
  };
  return (
    <details className="rider-settings" data-testid="rider-settings">
      <summary>
        Rider{" "}
        <span data-testid="rider-summary">
          {input ? "Your numbers" : "Reference rider"} ·{" "}
          {formatSpeed(calmSpeedMps, unit)} in still air
        </span>
      </summary>
      <div className="rider-fields">
        {fields.map((field) => (
          <label key={field.key}>
            <span>{field.label}</span>
            <span className="rider-input">
              <input
                type="number"
                inputMode="decimal"
                min={riderLimits[field.key].min}
                max={riderLimits[field.key].max}
                step={field.step}
                value={drafts[field.key]}
                aria-invalid={
                  parseRiderField(field.key, drafts[field.key]) === null
                }
                onChange={(event) => apply(field.key, event.target.value)}
              />
              <span aria-hidden="true">{field.unitLabel}</span>
            </span>
          </label>
        ))}
        <button type="button" onClick={reset} disabled={!input}>
          Use reference rider
        </button>
      </div>
      <p className="rider-note" aria-live="polite">
        {message ||
          "Flat road at constant power. Stored in this browser only. A physics estimate, not a validated personal prediction."}
      </p>
    </details>
  );
}
