// WMO weather interpretation codes (Open-Meteo) mapped to a small icon set.
export type WeatherKind =
  | "sun"
  | "moon"
  | "sun-cloud"
  | "moon-cloud"
  | "cloud"
  | "fog"
  | "drizzle"
  | "rain"
  | "showers"
  | "snow"
  | "thunder";
export function weatherKind(
  code: number | null,
  isDay: boolean | null,
): { kind: WeatherKind; label: string } | null {
  if (code === null) return null;
  const day = isDay !== false;
  if (code === 0)
    return day
      ? { kind: "sun", label: "Clear" }
      : { kind: "moon", label: "Clear night" };
  if (code <= 2)
    return day
      ? {
          kind: "sun-cloud",
          label: code === 1 ? "Mainly clear" : "Partly cloudy",
        }
      : {
          kind: "moon-cloud",
          label: code === 1 ? "Mainly clear" : "Partly cloudy",
        };
  if (code === 3) return { kind: "cloud", label: "Overcast" };
  if (code <= 48) return { kind: "fog", label: "Fog" };
  if (code <= 57) return { kind: "drizzle", label: "Drizzle" };
  if (code <= 67)
    return { kind: "rain", label: code >= 66 ? "Freezing rain" : "Rain" };
  if (code <= 77) return { kind: "snow", label: "Snow" };
  if (code <= 82) return { kind: "showers", label: "Showers" };
  if (code <= 86) return { kind: "snow", label: "Snow showers" };
  if (code <= 99) return { kind: "thunder", label: "Thunderstorm" };
  return null;
}
// Outline style after the BBC Weather symbol set. On the dark theme the
// "black" cloud outline is drawn near-white so it keeps its weight.
const yellow = "#ffd23f";
const blue = "#4da3ff";
const light = "#ffffff";
const cloudFill = "#ffffff";
const cloudFillDark = "#ffffff";
const cloudEdge = "#c5cfda";
const CloudPath =
  "M13 36 h22 a7.5 7.5 0 0 0 1.5 -14.8 a10.5 10.5 0 0 0 -20.2 -2.6 a8.4 8.4 0 0 0 -3.3 17.4z";
const Cloud = ({ variant = "heavy" }: { variant?: "heavy" | "light" }) => (
  <path
    d={CloudPath}
    fill={variant === "light" ? cloudFill : cloudFillDark}
    stroke={cloudEdge}
    strokeWidth={variant === "light" ? 1.6 : 2.4}
    strokeLinejoin="round"
  />
);
const Rays = ({
  x,
  y,
  r,
  from = 0,
  to = 8,
}: {
  x: number;
  y: number;
  r: number;
  from?: number;
  to?: number;
}) => (
  <g fill={yellow}>
    {Array.from({ length: 8 }, (_, i) => i)
      .filter((i) => i >= from && i < to)
      .map((i) => (
        <rect
          key={i}
          x={x - 1.6}
          y={y - r - 8.5}
          width={3.2}
          height={5.5}
          rx={1.4}
          transform={`rotate(${i * 45} ${x} ${y})`}
        />
      ))}
  </g>
);
const Sun = ({ x, y, r }: { x: number; y: number; r: number }) => (
  <g>
    <Rays x={x} y={y} r={r} />
    <circle cx={x} cy={y} r={r} fill={yellow} />
  </g>
);
const Moon = ({ x, y }: { x: number; y: number }) => (
  <path
    d={`M${x + 4} ${y - 9} a9 9 0 1 0 8 13 a7 7 0 0 1 -8 -13z`}
    fill={light}
  />
);
const Drop = ({ x, y }: { x: number; y: number }) => (
  <path d={`M${x} ${y} c-3 4 -3 7.5 0 7.5 c3 0 3 -3.5 0 -7.5z`} fill={blue} />
);
const Flake = ({ x, y }: { x: number; y: number }) => (
  <g stroke={light} strokeWidth="1.6" strokeLinecap="round">
    {[0, 60, 120].map((a) => (
      <line
        key={a}
        x1={x - 3.5}
        y1={y}
        x2={x + 3.5}
        y2={y}
        transform={`rotate(${a} ${x} ${y})`}
      />
    ))}
  </g>
);
const Bolt = () => (
  <path d="M27 36 l-6 9 h5 l-3 9 l9 -12 h-5 l3 -6z" fill={blue} />
);
const Fog = () => (
  <g stroke={light} strokeWidth="2.4" strokeLinecap="round">
    <line x1="13" y1="42" x2="35" y2="42" />
    <line x1="17" y1="48" x2="31" y2="48" />
  </g>
);
export default function WeatherIcon({
  code,
  isDay,
  size = 52,
}: {
  code: number | null;
  isDay: boolean | null;
  size?: number;
}) {
  const w = weatherKind(code, isDay);
  if (!w) return null;
  return (
    <svg
      className="weather-icon"
      viewBox="0 0 48 52"
      width={size}
      height={size}
      role="img"
      aria-label={w.label}
      data-testid="weather-icon"
      data-kind={w.kind}
    >
      <title>{w.label}</title>
      {w.kind === "sun" && <Sun x={24} y={26} r={10} />}
      {w.kind === "moon" && <Moon x={24} y={26} />}
      {w.kind === "sun-cloud" && (
        <>
          <Rays x={33} y={17} r={7} from={6} to={8} />
          <Rays x={33} y={17} r={7} from={0} to={3} />
          <circle cx={33} cy={17} r={7} fill={yellow} />
          <Cloud variant="light" />
        </>
      )}
      {w.kind === "moon-cloud" && (
        <>
          <Moon x={32} y={16} />
          <Cloud variant="light" />
        </>
      )}
      {w.kind === "cloud" && <Cloud />}
      {w.kind === "fog" && (
        <>
          <Cloud variant="light" />
          <Fog />
        </>
      )}
      {w.kind === "drizzle" && (
        <>
          <Cloud />
          <Drop x={24} y={38} />
        </>
      )}
      {w.kind === "rain" && (
        <>
          <Cloud />
          <Drop x={20} y={38} />
          <Drop x={28} y={40} />
        </>
      )}
      {w.kind === "showers" && (
        <>
          {isDay === false ? (
            <Moon x={34} y={15} />
          ) : (
            <>
              <Rays x={35} y={19} r={7} from={7} to={8} />
              <Rays x={35} y={19} r={7} from={0} to={3} />
            </>
          )}
          <Cloud />
          <Drop x={24} y={38} />
        </>
      )}
      {w.kind === "snow" && (
        <>
          <Cloud />
          <Flake x={20} y={42} />
          <Flake x={29} y={46} />
        </>
      )}
      {w.kind === "thunder" && (
        <>
          <Cloud />
          <Bolt />
        </>
      )}
    </svg>
  );
}
