const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const TIMEOUT_MS = 30000;

export type Envelope<T> = { data: T | null; error: string | null };

// Never throws — network errors, timeouts, and non-envelope error bodies (e.g.
// FastAPI's raw {"detail": "..."}) all collapse into {data: null, error: "..."}.
// A page that does `await apiFetch(...)` without a try/catch (most of them)
// would otherwise get stuck mid-request forever — button spinners never clear,
// no error ever shows, "nothing happens" — if this ever threw instead.
export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<Envelope<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
      signal: controller.signal,
    });
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      return { data: null, error: `Server returned an unreadable response (${res.status}).` };
    }
    if (body && typeof body === "object" && "data" in body && "error" in body) {
      return body as Envelope<T>;
    }
    if (!res.ok) {
      const detail =
        body && typeof body === "object" && "detail" in body
          ? String((body as { detail: unknown }).detail)
          : `Request failed (${res.status}).`;
      return { data: null, error: detail };
    }
    return { data: body as T, error: null };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { data: null, error: "Request timed out. Is the backend running?" };
    }
    return { data: null, error: "Could not reach the server. Is the backend running?" };
  } finally {
    clearTimeout(timeout);
  }
}

export function personaHeaders(personaId: string): HeadersInit {
  return { "X-Persona-Id": personaId };
}
