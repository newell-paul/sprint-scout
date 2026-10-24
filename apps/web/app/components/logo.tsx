import { body } from "../fonts";
function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <svg
      className="logo-mark"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <path
        d="M6 12 L20 24 L6 36"
        stroke="var(--data, #2dd4bf)"
        strokeOpacity="0.55"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M20 12 L34 24 L20 36"
        stroke="var(--data, #2dd4bf)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M34 24 H44"
        stroke="var(--wind, #38bdf8)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
export default function Logo({ className }: { className?: string }) {
  return (
    <span
      className={`logo ${body.className}${className ? ` ${className}` : ""}`}
    >
      <LogoMark />
      <span className="logo-word">
        Sprint<span className="logo-word-accent">Scout</span>
      </span>
    </span>
  );
}
