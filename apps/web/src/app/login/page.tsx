"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Persona, storePersona } from "@/lib/persona";

export default function LoginPage() {
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    apiFetch<Persona[]>("/personas").then((res) => {
      if (res.data) setPersonas(res.data);
      else setError(res.error ?? "Could not load personas");
    });
  }, []);

  async function login(personaId: string) {
    setLoggingIn(personaId);
    const res = await apiFetch<Persona>("/auth/persona-login", {
      method: "POST",
      body: JSON.stringify({ persona_id: personaId }),
    });
    if (res.data) {
      storePersona(res.data);
      router.push("/explore");
    } else {
      setError(res.error ?? "Login failed");
      setLoggingIn(null);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-heading font-bold text-2xl tracking-tight">
            SAME<span className="text-ai-match">WORLD</span>
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Pick a persona to explore as — this is a hackathon demo, not real
            authentication.
          </p>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-400 font-mono text-center">{error}</p>
        )}

        {personas && personas.length > 8 && (
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name or region…"
            className="w-full mb-3 bg-surface border border-border rounded-pill px-4 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-ai-match"
          />
        )}

        <div className="rounded-card border border-border bg-surface divide-y divide-border max-h-[60vh] overflow-y-auto">
          {personas === null && (
            <p className="p-6 text-sm text-text-secondary font-mono">Loading personas…</p>
          )}
          {personas
            ?.filter(
              (p) =>
                !filter ||
                p.display_name.toLowerCase().includes(filter.toLowerCase()) ||
                p.region_label.toLowerCase().includes(filter.toLowerCase())
            )
            .map((p) => (
            <button
              key={p.id}
              onClick={() => login(p.id)}
              disabled={loggingIn !== null}
              className="w-full flex items-center justify-between p-4 text-left transition-colors duration-micro hover:bg-white/[0.03] disabled:opacity-50"
            >
              <div>
                <p className="text-sm font-medium text-text-primary">{p.display_name}</p>
                <p className="text-xs text-text-secondary font-mono">{p.region_label}</p>
              </div>
              <span className="text-xs font-mono text-text-secondary">
                {loggingIn === p.id ? "…" : "→"}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-text-secondary font-mono">
          demo personas — is_demo: true
        </p>
      </div>
    </main>
  );
}
