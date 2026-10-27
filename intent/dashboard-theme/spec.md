# Spec: dashboard in the planner's colours

## Behaviour

- Page: `--bg` `#1e2a3a` with the planner's glow, `radial-gradient(900px 520px at 8% -10%, rgba(56,189,248,.08), transparent 60%)`.
- Tokens shared with the planner: `--bg`, `--surface` `#263345`, `--raised` `#2e3d52`, `--ink` `#ffffff`, `--muted` `#a5b4c8`, `--border` `rgba(148,163,184,.28)`. `--line` (chart grid and the neutral tone) becomes `rgba(148,163,184,.4)`.
- Cards: background `rgba(41,54,72,.85)`, border `1px solid rgba(45,212,191,.22)`, radius 16 px, shadow `0 12px 40px rgba(0,0,0,.35)`, the planner's `--panel-*` values. Hover keeps the 2 px lift with a deeper shadow and a stronger teal outline. The status glow and status-tinted border go; sparklines, rings, meters and hero values keep their status colour.
- Intent board columns: the same panel fill at 60 % with a fainter teal outline, 16 px radius.
- Phones: unchanged layout.

## Data and privacy

No change.

## Calculations

None.

## Tests

- `dashboard.test.ts`: the dashboard's `--bg`, `--surface`, `--raised`, `--ink`, `--muted` and `--border` equal the planner's in `apps/web/app/globals.css`, so the two cannot drift; cards use the panel fill, teal outline and shadow and carry no status glow.
- No ARIA or screenshot baselines cover the dashboard.

## Docs

`docs/design.md` entry "Dashboard in the planner's colours — 27 October 2026".
