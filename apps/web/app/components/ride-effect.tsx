import { formatSpeed, speedValue, type SpeedUnit } from "./speed";
function formatSpeedDelta(mps: number, unit: SpeedUnit = "km/h") {
  const value = speedValue(mps, unit);
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "±";
  return `${sign}${Math.abs(rounded).toFixed(1)} ${unit}`;
}
const scaleKmh = 20;
const pct = (mps: number) =>
  Math.max(0, Math.min(100, 50 + (speedValue(mps) / scaleKmh) * 50));
export default function RideEffect({
  speedDeltaMps,
  calmSpeedMps,
  band = null,
  compact = false,
  unit = "km/h",
}: {
  speedDeltaMps: number;
  calmSpeedMps: number;
  band?: {
    leadHours: number;
    speedDeltaLowMps: number;
    speedDeltaHighMps: number;
  } | null;
  compact?: boolean;
  unit?: SpeedUnit;
}) {
  const tone =
    speedDeltaMps > 0.1 ? "gain" : speedDeltaMps < -0.1 ? "loss" : "neutral";
  return (
    <div
      className={`ride-effect ride-effect-${tone}${compact ? " compact" : ""}`}
      data-testid="ride-effect"
      data-tone={tone}
    >
      <span className="ride-effect-title">Modelled speed effect</span>
      <span className="ride-effect-value">
        {formatSpeedDelta(speedDeltaMps, unit)}
      </span>{" "}
      {band && (
        <span
          className="ride-effect-band"
          data-testid="ride-effect-band"
          title={`Estimated range ${formatSpeedDelta(band.speedDeltaLowMps, unit)} to ${formatSpeedDelta(band.speedDeltaHighMps, unit)}, ${Math.round(band.leadHours)} h ahead`}
        >
          <span
            className="ride-effect-band-fill"
            style={{
              left: `${pct(band.speedDeltaLowMps)}%`,
              width: `${pct(band.speedDeltaHighMps) - pct(band.speedDeltaLowMps)}%`,
            }}
          />
          <span
            className="ride-effect-band-mark"
            style={{ left: `${pct(speedDeltaMps)}%` }}
          />
          <span className="ride-effect-band-zero" />
        </span>
      )}
      {!compact && (
        <span className="ride-effect-scale">
          <span>Slower</span>
          <span>Neutral</span>
          <span>Faster</span>
        </span>
      )}
      <span className="ride-effect-label">
        {tone === "gain" ? "faster" : tone === "loss" ? "slower" : "no change"}{" "}
        for a reference rider
        {compact ? "" : ` · calm pace ${formatSpeed(calmSpeedMps, unit)}`}
        {band && !compact
          ? ` · estimated range ${formatSpeedDelta(band.speedDeltaLowMps, unit)} to ${formatSpeedDelta(band.speedDeltaHighMps, unit)} (${Math.round(band.leadHours)} h ahead)`
          : ""}
      </span>
      {!compact && (
        <span className="ride-effect-label">
          Flat road · 85 kg rider + bike · Shelter not modelled. Range uses
          assumed wind errors, not validated confidence. Not a personal
          prediction.
        </span>
      )}
    </div>
  );
}
