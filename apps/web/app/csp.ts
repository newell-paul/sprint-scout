// GitHub Pages cannot send headers, so the static export carries this as a
// meta tag. Next's static export inlines its bootstrap scripts, hence
// 'unsafe-inline'; the policy's job is to keep code and saved data from
// reaching any host but these.
const tiles = "https://tile.openstreetmap.org";
const directives: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "font-src": ["'self'"],
  "img-src": ["'self'", "data:", "blob:", tiles],
  "connect-src": [
    "'self'",
    "https://api.open-meteo.com",
    "https://archive-api.open-meteo.com",
    tiles,
  ],
  "worker-src": ["'self'", "blob:"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
};
export const contentSecurityPolicy = Object.entries(directives)
  .map(([name, sources]) => `${name} ${sources.join(" ")}`)
  .join("; ");
