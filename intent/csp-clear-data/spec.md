# Spec: content security policy and clear saved data

## Behaviour

- **Policy:** the static export's `<head>` carries `<meta http-equiv="Content-Security-Policy">` with `default-src 'self'`; scripts and styles from the page itself plus inline (Next's static export inlines its bootstrap); images from the page, `data:`, `blob:` and `tile.openstreetmap.org`; connections to the page, `api.open-meteo.com`, `archive-api.open-meteo.com` and `tile.openstreetmap.org`; workers from the page and `blob:`; `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. No `unsafe-eval`. The dev server has no policy, because Fast Refresh needs eval.
- **Zod:** runs `jitless`, so its `Function("")` probe never fires a violation.
- **Clear saved data:** inside Data & privacy, a "Clear saved data" button. Pressing it shows "Delete every saved segment, effort, terrain profile and rider setting from this browser? This cannot be undone." with "Delete everything" and "Keep my data". Delete everything removes every `sprint-scout.` key from local storage and reloads, so the planner starts as a first visit with the example segment. Keep my data returns to the button. If storage throws, an alert says "Cannot clear saved data in this browser."
- The privacy note now ends "Clearing saved data, here or in the browser, deletes everything the planner stored."

## Data and privacy

Nothing new leaves the browser. The policy narrows what can.

## Calculations

None.

## Tests

- **Unit:** `csp.test.ts` (allowed hosts, no eval, no plugins, base URI); `library.test.ts` `clearSavedData` (removes only planner keys); contracts test that Zod is jitless.
- **Component:** `clear-data.browser.test.tsx`: blocked storage shows the alert and keeps the data.
- **E2E:** `privacy.spec.ts`: clearing deletes the seeded segment and rider and shows the example (@smoke); backing out keeps everything; a full journey records no `securitypolicyviolation`, and on the static export the meta tag is present (@smoke).

## Docs

`docs/design.md` entry.
