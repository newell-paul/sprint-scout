# Content security policy and clear saved data

Status: done
Opened: 25 October 2026 by Paul Newell

## Problem

A privacy and security review found two gaps on the published planner. GitHub Pages cannot send security headers, so nothing stops an injected or compromised script from loading code or sending saved segments to another host. And a rider on a shared computer can only delete what the planner stored through the browser's site settings.

## Proposed outcome

- The published page carries a content security policy that lets it reach only itself, Open-Meteo and the OpenStreetMap tiles.
- The Data & privacy note has a "Clear saved data" button that, after a confirmation, deletes everything the planner stored in this browser.

## Affected users and parts

`apps/web/app/layout.tsx`, a new `csp.ts`, `routes/library.ts`, a new `routes/clear-data.tsx`, `route-drawer.tsx` (footer), `globals.css`, `packages/contracts` (Zod configuration), `e2e/privacy.spec.ts` and a page object.

## Constraints

Static hosting only, so the policy is a meta tag. No new network requests. The deploy gate (smoke, size, Lighthouse) stays green.

## Open questions

None: the owner asked for both after the review.
