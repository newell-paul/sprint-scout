// Serves the static export the way GitHub Pages does for a project site: the
// files under apps/web/out answer at the base path (and at the root, so the
// e2e specs' absolute paths keep working), unknown paths get 404.html, and
// nothing else is reachable. Dependency-free so the deploy gate stays small.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const root = resolve(process.argv[2] ?? "apps/web/out");
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const port = Number(process.env.PORT ?? 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

async function fileFor(pathname) {
  let relative = pathname;
  if (basePath && relative.startsWith(basePath))
    relative = relative.slice(basePath.length) || "/";
  const safe = normalize(decodeURIComponent(relative)).replace(
    /^(\.\.[/\\])+/,
    "",
  );
  const candidates = safe.endsWith("/")
    ? [join(safe, "index.html")]
    : [safe, `${safe}.html`, join(safe, "index.html")];
  for (const candidate of candidates) {
    const path = join(root, candidate);
    if (!path.startsWith(root)) continue;
    try {
      if ((await stat(path)).isFile()) return { path, status: 200 };
    } catch {
      /* try the next candidate */
    }
  }
  return { path: join(root, "404.html"), status: 404 };
}

createServer(async (request, response) => {
  const { pathname } = new URL(
    request.url ?? "/",
    `http://${request.headers.host}`,
  );
  const { path, status } = await fileFor(pathname);
  try {
    let body = await readFile(path);
    const type = types[extname(path)] ?? "application/octet-stream";
    const headers = { "content-type": type, "cache-control": "no-store" };
    // Pages serves text compressed; measure transfer the way visitors get it.
    if (
      /text|json|svg/.test(type) &&
      /\bgzip\b/.test(request.headers["accept-encoding"] ?? "")
    ) {
      body = gzipSync(body);
      headers["content-encoding"] = "gzip";
    }
    response.writeHead(status, headers);
    response.end(body);
  } catch {
    response.writeHead(404).end("not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(
    `static export at http://127.0.0.1:${port}${basePath}/ from ${root}`,
  );
});
