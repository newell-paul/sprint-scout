import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const app = path.dirname(fileURLToPath(import.meta.url));
const sources = readdirSync(app, { recursive: true, encoding: "utf8" })
  .filter((file) => /\.tsx?$/.test(file) && !file.includes("node_modules"))
  .filter((file) => !file.endsWith(".test.ts"))
  .filter((file) => statSync(path.join(app, file)).isFile());

// next/font/google downloads at compile time, so one failed fetch on a CI
// runner broke every e2e test in a shard.
describe("fonts", () => {
  it("never loads fonts from Google at build time", () => {
    const offenders = sources.filter((file) =>
      readFileSync(path.join(app, file), "utf8").includes("next/font/google"),
    );
    expect(offenders).toEqual([]);
  });

  it("ships every font file it declares", () => {
    const declared = [
      ...readFileSync(path.join(app, "fonts.ts"), "utf8").matchAll(
        /path: "(\.\/fonts\/[^"]+\.woff2)"/g,
      ),
    ].map((match) => match[1]!);
    expect(declared).toHaveLength(5);
    expect(
      declared.filter((file) => !existsSync(path.join(app, file))),
    ).toEqual([]);
  });
});
