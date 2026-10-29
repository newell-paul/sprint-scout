// Turns `git status --porcelain` lines into the changes the Visual baselines
// workflow may commit. Only files under e2e/__screenshots__ are ever touched.
export type BaselineChange = { path: string; change: "write" | "delete" };

const root = "e2e/__screenshots__/";
const unquote = (path: string) =>
  path.startsWith('"') && path.endsWith('"') ? path.slice(1, -1) : path;
const inside = (path: string) =>
  path.startsWith(root) && !path.split("/").includes("..");

export function baselineTree(lines: string[]): BaselineChange[] {
  const changes: BaselineChange[] = [];
  for (const line of lines) {
    if (line.length < 4) continue;
    const status = line.slice(0, 2);
    const [from, to] = line.slice(3).split(" -> ").map(unquote);
    if (status.includes("R") && to !== undefined) {
      if (inside(from!)) changes.push({ path: from!, change: "delete" });
      if (inside(to)) changes.push({ path: to, change: "write" });
      continue;
    }
    if (!inside(from!)) continue;
    changes.push({
      path: from!,
      change: status.includes("D") ? "delete" : "write",
    });
  }
  return changes;
}
