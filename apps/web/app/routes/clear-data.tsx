"use client";
import { useState } from "react";
import { clearSavedData } from "./library";

// Reloading starts the planner as a first visit: every panel rereads storage.
export default function ClearData() {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");
  const clear = () => {
    try {
      clearSavedData(localStorage);
      location.reload();
    } catch {
      setMessage("Cannot clear saved data in this browser.");
    }
  };
  return (
    <div className="clear-data" data-testid="clear-data">
      {confirming ? (
        <>
          <p>
            Delete every saved segment, effort, terrain profile and rider
            setting from this browser? This cannot be undone.
          </p>
          <button type="button" onClick={clear}>
            Delete everything
          </button>
          <button type="button" onClick={() => setConfirming(false)}>
            Keep my data
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setConfirming(true)}>
          Clear saved data
        </button>
      )}
      {message && <p role="alert">{message}</p>}
    </div>
  );
}
