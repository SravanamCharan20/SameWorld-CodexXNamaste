const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export type Envelope<T> = { data: T | null; error: string | null };

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<Envelope<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  return res.json();
}
