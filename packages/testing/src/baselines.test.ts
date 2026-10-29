import { describe, expect, it } from "vitest";
import { baselineTree } from "./baselines";

const dir = "e2e/__screenshots__/chromium-desktop";

describe("baselineTree", () => {
  it("adds and modifies files as blobs", () => {
    expect(
      baselineTree([
        `?? ${dir}/new.png`,
        ` M ${dir}/dial-calm.png`,
        `M  ${dir}/staged.png`,
      ]),
    ).toEqual([
      { path: `${dir}/new.png`, change: "write" },
      { path: `${dir}/dial-calm.png`, change: "write" },
      { path: `${dir}/staged.png`, change: "write" },
    ]);
  });

  it("deletes removed files", () => {
    expect(baselineTree([` D ${dir}/gone.png`])).toEqual([
      { path: `${dir}/gone.png`, change: "delete" },
    ]);
  });

  it("splits a rename into a delete and a write", () => {
    expect(baselineTree([`R  ${dir}/old.png -> ${dir}/new.png`])).toEqual([
      { path: `${dir}/old.png`, change: "delete" },
      { path: `${dir}/new.png`, change: "write" },
    ]);
  });

  it("unquotes paths git quotes", () => {
    expect(baselineTree([` M "${dir}/a b.png"`])).toEqual([
      { path: `${dir}/a b.png`, change: "write" },
    ]);
  });

  it("ignores anything outside the screenshots folder", () => {
    expect(
      baselineTree([
        " M apps/web/AGENTS.md",
        "?? e2e/__screenshots__x/sneaky.png",
        ` M ${dir}/../../../package.json`,
        "",
      ]),
    ).toEqual([]);
  });
});
