import { readFileSync, writeFileSync } from "node:fs";
import { nextVersion } from "./release";

// tsx release-bump.cli.ts <x.y.z>
// Sets the root package.json version and nothing else. Run on a release-<x.y.z>
// branch when the owner asks; the Release workflow tags it after merge.
const requested = process.argv[2] ?? "";
const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  name: string;
  version?: string;
};
try {
  const version = nextVersion(pkg.version, requested);
  // Key order is kept; a first version goes straight after the name.
  const { name, ...rest } = pkg;
  const next = pkg.version ? { ...pkg, version } : { name, version, ...rest };
  writeFileSync("package.json", JSON.stringify(next, null, 2) + "\n");
  console.log(`Version ${pkg.version ?? "none"} -> ${version}`);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
