# Spec: saved data

## Behaviour

- **B1:** `readLibrary` accepts an effort's `startedAt`, `importedAt` and `wind.retrievedAt` only when they are ISO 8601 date-times with `Z` or an offset, and returns them as `new Date(value).toISOString()`. A zone-less time fails validation like any other malformed effort.
- **B2:** `matchEfforts` reports `elapsedSeconds` of at least 0.1.
- **B3:** `RiderSettings.onChange` returns whether the numbers were stored. When it returns false the rider note reads "Could not save your numbers in this browser; they apply until you close the page." The next successful change restores the default note.
- **B4:** `parseGpx` returns `skipped` (points dropped for a missing or unusable position or time, or a time that does not advance) and `zoneless` counts. When `skipped > 0`, the import message, whether efforts were added or no traversal was found, ends with "N track points were skipped for a missing or out-of-order time or position", plus "; M had a time with no zone" when `zoneless > 0`.
- **B5:** `validWind` rejects `speedMps > 0` with `fromDegrees: null`. Calm (`0`) with a null direction, and null speed, stay valid.
- **B6:** comments only.

## Data and privacy

Nothing new leaves the browser. Stored shapes are unchanged; B1 normalises on read, and the next save writes the normalised form.

## Calculations

B2 is a floor on a rounded value; no model change.

## Tests

- Unit: `library.test.ts` (offset time normalised, zone-less rejected, speed without direction rejected, calm accepted), `effort-match.test.ts` (sub-0.05 s crossing reports 0.1), `gpx.test.ts` (skipped and zoneless counts).
- Component: `rider-settings.browser.test.tsx` (refused store shows the note), `efforts-panel.browser.test.tsx` (import message names skipped points).
- No ARIA baseline changes.

## Docs

`docs/design.md` entry "Saved data hardening — 25 October 2026".
