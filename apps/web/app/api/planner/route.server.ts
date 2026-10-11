import { getPlannerData } from "@scout/application";
export async function GET(request: Request) {
  if (request.url.length > 4096)
    return Response.json({ error: "Request too large" }, { status: 400 });
  const params = new URL(request.url).searchParams;
  const input: Record<string, unknown> = {
    segmentIds: params.getAll("segmentIds"),
  };
  for (const [key, value] of params) {
    if (key === "segmentIds") continue;
    if (params.getAll(key).length !== 1)
      return Response.json({ error: "Repeated input" }, { status: 400 });
    input[key] = value;
  }
  try {
    return Response.json(await getPlannerData(input), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const known = [
      "AMBIGUOUS_LOCAL_TIME",
      "NONEXISTENT_LOCAL_TIME",
      "INVALID_LOCAL_TIME",
      "INVALID_WINDOW",
    ].find((c) => code === c);
    return Response.json(
      { error: known ?? "Invalid planner input" },
      { status: 400 },
    );
  }
}
