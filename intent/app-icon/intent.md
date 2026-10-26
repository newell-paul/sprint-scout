# New app icon on the planner, the dashboard and the iPhone Home Screen

Status: done
Opened: 26 October 2026 by Paul Newell

## Problem

The planner's favicon is an old compass mark that matches neither the in-page logo nor the new icon artwork in `docs/images/icon.png`. Adding the planner to an iPhone Home Screen shows a page screenshot, because there is no `apple-touch-icon`. The dashboard has no favicon.

## Proposed outcome

The new icon is the favicon and the page logo on the planner and the dashboard, and the iPhone Home Screen icon.

## Affected users and parts

`apps/web/app` (icon files, `components/logo.tsx`, `globals.css`), `packages/testing/src/dashboard.ts` and `dashboard.cli.ts`, the dashboard logo test.

## Constraints

Every icon is served from the site's own origin; the CSP's `img-src 'self'` already allows it. Bundle size stays under its ceiling.

## Open questions

None.
