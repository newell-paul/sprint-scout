import postgres from "postgres";
export function connect() {
  const url =
    process.env.DATABASE_URL ??
    "postgresql://demo:demo_local_only@127.0.0.1:5432/scout_demo";
  const parsed = new URL(url);
  if (
    !["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname) ||
    parsed.pathname !== "/scout_demo"
  )
    throw new Error(
      "Foundation database commands require a local scout_demo database",
    );
  return postgres(url, { max: 1, connect_timeout: 5 });
}
