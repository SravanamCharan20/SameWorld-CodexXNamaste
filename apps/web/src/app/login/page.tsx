"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Loader2 } from "lucide-react";
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

  const filtered = personas?.filter(
    (p) =>
      !filter ||
      p.display_name.toLowerCase().includes(filter.toLowerCase()) ||
      p.region_label.toLowerCase().includes(filter.toLowerCase())
  );

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
          <div className="relative mb-3">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by name or region…"
              className="input-base w-full rounded-pill pl-10"
            />
          </div>
        )}

        <div className="card-base divide-y divide-border max-h-[60vh] overflow-y-auto">
          {personas === null && (
            <div className="p-3 space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-[52px] w-full" />
              ))}
            </div>
          )}
          {filtered?.length === 0 && (
            <p className="p-6 text-sm text-text-secondary text-center">
              No personas match &ldquo;{filter}&rdquo;.
            </p>
          )}
          {filtered?.map((p) => (
            <button
              key={p.id}
              onClick={() => login(p.id)}
              disabled={loggingIn !== null}
              className="w-full flex items-center justify-between p-4 text-left transition-colors duration-micro hover:bg-white/[0.04] active:bg-white/[0.06] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ai-match"
            >
              <div>
                <p className="text-sm font-medium text-text-primary">{p.display_name}</p>
                <p className="text-xs text-text-secondary font-mono">{p.region_label}</p>
              </div>
              <span className="text-text-secondary">
                {loggingIn === p.id ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <ArrowRight size={15} />
                )}
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
