import Image from "next/image";
import { body } from "../fonts";
import mark from "./logo-mark.png";
export default function Logo({ className }: { className?: string }) {
  return (
    <span
      className={`logo ${body.className}${className ? ` ${className}` : ""}`}
    >
      <Image
        className="logo-mark"
        src={mark}
        alt=""
        width={56}
        height={56}
        unoptimized
        loading="eager"
      />
      <span className="logo-word">
        Sprint<span className="logo-word-accent">Scout</span>
      </span>
    </span>
  );
}
