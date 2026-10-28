# Add segment flow: findings

Walked on the dev server at `main` `022b49b`, 28 October 2026, at 1280 × 900 and 390 × 844, starting from the example segment and pressing "Add segment".

## What happens today

1. "Add segment" opens slot 2 in drawing mode. There is no Cancel button until a point is placed. The only way back is to pick another segment tab, and nothing says so.
2. The first click or tap on the map places nothing. It only activates the map (`docs/design.md`, "the activating click places no point"). The guidance above the map says "Tap the map to place your start", so a first-time rider taps and sees nothing happen. In the walk, two taps placed one point on both sizes.
3. After the first point, every segment tab is disabled and the board hides. The text "Save or cancel your drawing before switching segments" appears under the map.
4. "Cancel drawing" is the last control in the editor, after the undo buttons, two expanders, the name field and a four-line confirmation:

   | Viewport   | Map top | Cancel drawing at | Visible without scrolling |
   | ---------- | ------- | ----------------- | ------------------------- |
   | 1280 × 900 | 285 px  | 1063 px           | No                        |
   | 390 × 844  | 260 px  | 1063 px           | No                        |

5. Saving needs at least two points, a name and the independent-source tick. The steps strip ("1. Start, 2. Finish, 3. Name, 4. Save") shows progress but its steps can't be clicked.

## Ways to bring in a segment the rider already has

| Source                                                                         | Position                                                                                                                                                                                                                             | Recommendation                                        |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Draw on the map                                                                | Mode 2, today's path                                                                                                                                                                                                                 | Keep, make it easier                                  |
| Enter coordinates                                                              | Mode 2, today's path                                                                                                                                                                                                                 | Keep                                                  |
| A GPX of the rider's own ride, from their bike computer or Garmin Connect      | Mode 2: an original device file. Efforts already accept these with an own-recording tick (13 September 2026 entry)                                                                                                                   | Build: pick start and finish on the ride              |
| The same ride from Strava's "Export Original"                                  | Downloads the file as it was uploaded, usually the device's FIT file ([Strava support](https://support.strava.com/hc/en-us/articles/216918437-Exporting-your-Data)). FIT isn't read today. A GPX original is the device's own file   | Allowed as a GPX on the same tick; FIT later if asked |
| Strava's "Export GPX" of the rider's own activity                              | A file Strava generates from the recording. `docs/design.md` says a Strava-exported file is not automatically independent; the efforts import leaves that judgement to the rider's tick                                              | Same tick as efforts, rider's judgement               |
| A route the rider made in Strava's route builder                               | Geometry made with Strava's tools and maps, not recorded by the rider                                                                                                                                                                | Don't build                                           |
| A Strava segment page                                                          | The segment is Strava's object, often made by someone else. Any segment GPX option is undocumented and varies by segment type                                                                                                        | Don't build                                           |
| Strava's API, or coordinates read through the official Strava MCP and typed in | API data and derivatives are restricted ([API agreement](https://www.strava.com/legal/api)); the MCP exception is for personal use inside the MCP, and typing its coordinates in would contradict the "independently of Strava" tick | Don't build                                           |

The useful path is the first "Build" row. Most riders already have the ride with the sprint in it on their bike computer, so the app can show that ride on the map and let them mark the start and the finish on it. That gives real road geometry, which hand drawing doesn't, without touching Strava's data.

## Decisions

Recorded in the [intent](intent.md): one bar above the map with Undo and Cancel, no tab lock with Restore after a discard, the first tap placing a point while drawing, a default name, the independent-source tick kept, and segment from a ride as its own intent behind a dated owner entry in `docs/integration-decisions.md`.
