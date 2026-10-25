# Spec: GPX robustness and target sync

## Behaviour

- Importing a GPX file with a `<trkpt>` that has no closing tag, or an opening tag with no `>`, says "GPX file has a track point that is not closed." Well-formed files read as before, self-closing points included.
- Choosing a file larger than 25 MB says "GPX file is missing or larger than 25 MB." without reading it.
- When the stored target changes, the target field shows it (`m:ss`, or empty when removed). A status message after a save stays.

## Data and privacy

No change. Nothing leaves the browser on import.

## Calculations

The reader scans forward only: each search starts where the previous one ended, so parsing time is linear in the file length.

## Tests

- Unit (`gpx.test.ts`): an unclosed point is rejected, including one followed by a valid point; 200 000 unclosed tags are rejected in under a second.
- Component (`efforts-panel.browser.test.tsx`): an oversized file is refused and `file.text` is never called.
- Component (`target-settings.browser.test.tsx`): a new `target` prop updates the field.
- No ARIA baseline changes.

## Docs

`docs/design.md` entry "GPX reader scans forward; target follows storage — 25 October 2026". Lessons entry for F5.
