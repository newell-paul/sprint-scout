import { display } from "../fonts";
function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <svg
      className="logo-mark"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <circle
        cx="24"
        cy="24"
        r="17"
        stroke="var(--teal, #76d5be)"
        strokeWidth="4.5"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="80 27"
        transform="rotate(-100 24 24)"
      />
      <path d="M24 24 L38 10 L31 26 Z" fill="currentColor" />
      <circle cx="24" cy="24" r="3.5" fill="var(--coral, #ff7166)" />
    </svg>
  );
}
export default function Logo({ className }: { className?: string }) {
  return (
    <span
      className={`logo ${display.className}${className ? ` ${className}` : ""}`}
    >
      <LogoMark />
      <span className="logo-word">
        Sprint<span className="logo-word-accent">Scout</span>
      </span>
    </span>
  );
}
