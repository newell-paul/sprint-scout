"use client";
import { useState } from "react";
import { parseTarget } from "./attempt";
import { formatDuration } from "../components/time";

const format = (target: number | null) =>
  target === null
    ? ""
    : `${Math.floor(target / 60)}:${String(target % 60).padStart(2, "0")}`;

export default function TargetSettings({
  target,
  onChange,
}: {
  target: number | null;
  onChange: (target: number | null) => boolean;
}) {
  const [value, setValue] = useState(format(target));
  // A target saved in another tab or removed elsewhere replaces the draft, so
  // a stale value is never saved over it.
  const [shown, setShown] = useState(target);
  if (target !== shown) {
    setShown(target);
    setValue(format(target));
  }
  const [message, setMessage] = useState("");
  return (
    <section
      className="attempt-settings target-settings"
      aria-label="Segment target time"
    >
      <h3>
        Segment target · {target === null ? "Not set" : formatDuration(target)}
      </h3>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = parseTarget(value);
          if (parsed === null) {
            setMessage("Enter minutes:seconds, from 0:01 to 1440:00.");
            return;
          }
          setMessage(
            onChange(parsed)
              ? "Target saved in this browser."
              : "Target could not be saved. Try again.",
          );
        }}
      >
        <label>
          Target time (minutes:seconds)
          <input
            value={value}
            placeholder="1:30"
            maxLength={7}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
        <button type="submit">Save target</button>
        <button
          type="button"
          disabled={target === null}
          onClick={() => {
            if (onChange(null)) {
              setValue("");
              setMessage("Target removed.");
            } else setMessage("Target could not be removed. Try again.");
          }}
        >
          Remove target
        </button>
      </form>
      <small>
        A goal, not a verified personal best or prediction of success.
      </small>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
