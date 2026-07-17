"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Persona, storePersona } from "@/lib/persona";
import ColdStartLoader from "@/components/ColdStartLoader";

// The demo seeds 160+ personas so search/browse has real variety, but a
// 160-row picker is more than anyone needs to choose an identity from.
// Picking evenly by alphabetical index (the previous approach) produced an
// accidentally Europe/UK-heavy set, since alphabetical order has nothing to
// do with geography — this is a hand-picked spread across six actually
// distinct continents/regions instead.
const PICKER_IDS = [
  "persona_seed_025", // Simran — Gurgaon, India (South Asia)
  "persona_profile_013", // Bianca — Sao Paulo, Brazil (South America)
  "persona_profile_009", // Naledi — Cape Town, South Africa (Africa)
  "persona_profile_006", // Diego — Mexico City, Mexico (Latin America)
  "persona_profile_004", // Jonas — Stockholm, Sweden (Northern Europe)
  "persona_seed_094", // Harper — Melbourne, Australia (Oceania)
];

function pickCurated<T extends { id: string }>(items: T[]): T[] {
  const byId = new Map(items.map((p) => [p.id, p]));
  const picked = PICKER_IDS.map((id) => byId.get(id)).filter((p): p is T => !!p);
  return picked.length > 0 ? picked : items.slice(0, 6);
}

export default function LoginPage() {
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Persona[]>("/personas").then((res) => {
      if (res.data) setPersonas(pickCurated(res.data));
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
            Choose a profile to continue.
          </p>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-400 font-mono text-center">{error}</p>
        )}

        {personas === null && !error && (
          <div className="card-base">
            <ColdStartLoader />
          </div>
        )}

        <div className={personas === null ? "hidden" : "card-base divide-y divide-border"}>
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
      </div>
    </main>
  );
}
