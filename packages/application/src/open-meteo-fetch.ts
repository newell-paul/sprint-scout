// One request to an Open-Meteo endpoint: no cookies, referrer, cache or
// redirect, and a byte cap enforced while the body streams, so an oversized
// response is dropped before it is held in memory.
export async function fetchOpenMeteo(
  url: URL,
  {
    service,
    body,
    maxBytes,
    signal,
    fetcher,
  }: {
    /** Names the service in errors: "Weather service", "Weather archive". */
    service: string;
    /** Names the response in errors: "Weather", "Elevation", "Archive". */
    body: string;
    maxBytes: number;
    signal: AbortSignal;
    fetcher: typeof fetch;
  },
): Promise<unknown> {
  const response = await fetcher(url, {
    signal,
    credentials: "omit",
    referrerPolicy: "no-referrer",
    cache: "no-store",
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? `${service} rate limit reached. Try again later.`
        : `${service} unavailable. Try again.`,
    );
  const reader = response.body?.getReader();
  if (!reader) throw new Error(`Empty ${body.toLowerCase()} response.`);
  const decoder = new TextDecoder();
  let raw = "";
  let bytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > maxBytes) throw new Error(`${body} response is too large.`);
      raw += decoder.decode(part.value, { stream: true });
    }
    raw += decoder.decode();
  } finally {
    await reader.cancel();
  }
  return JSON.parse(raw);
}
