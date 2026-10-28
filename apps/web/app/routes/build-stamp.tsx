// Baked in at build time by next.config.ts, so showing it makes no request.
export default function BuildStamp({
  version = process.env.NEXT_PUBLIC_APP_VERSION ?? "",
  commit = process.env.NEXT_PUBLIC_COMMIT ?? "",
}: {
  version?: string;
  commit?: string;
}) {
  if (!version) return null;
  return (
    <span className="build-stamp">
      <a
        href={`https://github.com/newell-paul/sprint-scout/releases/tag/v${version}`}
      >
        v{version}
      </a>
      {commit ? <code>{commit.slice(0, 7)}</code> : null}
    </span>
  );
}
