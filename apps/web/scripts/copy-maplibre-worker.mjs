// MapLibre GL 6 loads its web worker from a URL next to the library bundle.
// Next rewrites that URL, so the worker and the shared chunk it imports are
// served from public/maplibre instead; runs before dev and build.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.join(process.cwd(), "package.json"));
const dist = path.join(
  path.dirname(require.resolve("maplibre-gl/package.json")),
  "dist",
);
const dest = path.join(process.cwd(), "public", "maplibre");
mkdirSync(dest, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"])
  copyFileSync(path.join(dist, file), path.join(dest, file));
// BSD-3 asks for the notice to ship with the distributed code.
copyFileSync(
  path.join(dist, "..", "LICENSE.txt"),
  path.join(dest, "LICENSE.txt"),
);
