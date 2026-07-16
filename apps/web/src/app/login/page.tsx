"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Persona, storePersona } from "@/lib/persona";

const PICKER_SIZE = 6;

// The demo seeds ~20 personas so search/browse has real variety, but a
// 20-row picker is more than anyone needs to choose an identity from — 6,
// spread evenly across the (alphabetically, so region-varied) sorted list
// rather than just the first 6, keeps the picker short without collapsing
// it to a handful of near-identical names.
function pickSpread<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  const step = items.length / count;
  return Array.from({ length: count }, (_, i) => items[Math.floor(i * step)]);
}

export default function LoginPage() {
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Persona[]>("/personas").then((res) => {
      if (res.data) setPersonas(pickSpread(res.data, PICKER_SIZE));
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

        <div className="card-base divide-y divide-border">
          {personas === null && (
            <div className="p-3 space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-[52px] w-full" />
              ))}
            </div>
          )}
          {personas?.map((p) => (
            <button
              key={p.id}
              onClick={() => login(p.id)}
              disabled={loggingIn !== null}
              className="w-full flex items-center justify-between p-4 text-left cursor-pointer transition-colors duration-micro hover:bg-white/[0.04] active:bg-white/[0.06] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ai-match"
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
