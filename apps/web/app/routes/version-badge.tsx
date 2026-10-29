// Baked in at build time by next.config.ts, so showing it makes no request.
export default function VersionBadge({
  version = process.env.NEXT_PUBLIC_APP_VERSION ?? "",
  commit = process.env.NEXT_PUBLIC_COMMIT ?? "",
}: {
  version?: string;
  commit?: string;
}) {
  if (!version) return null;
  const build = commit.slice(0, 7);
  const name = `SprintScout v${version}`;
  return (
    <a
      className="version-badge"
      href={`https://github.com/newell-paul/sprint-scout/releases/tag/v${version}`}
      aria-label={build ? `${name}, build ${build}` : name}
      title={build ? `Build ${build}` : name}
    >
      <span>{name}</span>
    </a>
  );
}
