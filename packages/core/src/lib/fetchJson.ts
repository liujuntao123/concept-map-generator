/** Fetch JSON with friendly errors. SPA fallbacks often return HTML 200 for missing paths. */
export async function fetchJson<T>(url: string, notFoundMessage: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error(notFoundMessage);
  }

  const text = await res.text();
  const trimmed = text.trimStart();
  if (!res.ok || trimmed.startsWith('<') || trimmed.startsWith('<!')) {
    throw new Error(notFoundMessage);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(notFoundMessage);
  }
}
