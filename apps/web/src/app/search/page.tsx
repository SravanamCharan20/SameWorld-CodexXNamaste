"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getStoredPersona, Persona } from "@/lib/persona";
import { SearchResponse, SearchResult } from "@/lib/types";

export default function SearchPage() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [queryText, setQueryText] = useState("");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredPersona();
    if (!stored) {
      router.push("/login");
      return;
    }
    setPersona(stored);
  }, [router]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!queryText.trim()) return;
    setSearching(true);
    setError(null);
    const res = await apiFetch<SearchResponse>("/search", {
      method: "POST",
      body: JSON.stringify({ query_text: queryText }),
    });
    if (res.data) setResponse(res.data);
    else setError(res.error ?? "Search failed");
    setHasSearched(true);
    setSearching(false);
  }

  if (!persona) return null;

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="w-full max-w-lg mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-heading font-bold text-xl tracking-tight">
            SAME<span className="text-ai-match">WORLD</span>
          </h1>
          <a
            href="/me"
            className="text-xs font-mono text-text-secondary hover:text-text-primary transition-colors duration-micro"
          >
            my signals
          </a>
        </div>

        <form onSubmit={search} className="mb-8">
          <div className="flex gap-2">
            <input
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search for a human — a need, a question, a plan, a mood…"
              className="flex-1 bg-surface border border-border rounded-pill px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-ai-match"
            />
            <button
              type="submit"
              disabled={searching || !queryText.trim()}
              className="rounded-pill bg-ai-match text-background text-sm font-medium px-6 disabled:opacity-40 transition-opacity duration-micro"
            >
              {searching ? "…" : "Search"}
            </button>
          </div>
        </form>

        {error && <p className="text-sm text-red-400 font-mono mb-4">{error}</p>}

        {searching && (
          <p className="text-sm text-text-secondary font-mono">Understanding what you need…</p>
        )}

        {!searching && hasSearched && response?.empty && (
          <div className="rounded-card border border-border bg-surface p-8 text-center">
            <p className="text-sm text-text-primary mb-1">{response.message}</p>
            <p className="text-xs text-text-secondary mt-3">
              Nothing is ever forced — an honest empty state beats a fabricated match.
            </p>
          </div>
        )}

        {!searching && response && !response.empty && (
          <div className="space-y-2">
            {response.results.map((r) => (
              <ResultCard key={r.signal_id} result={r} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ResultCard({ result }: { result: SearchResult }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              result.kind === "NOW" ? "bg-now" : result.kind === "OPEN" ? "bg-open" : "bg-ai-match"
            }`}
          />
          <span className="text-xs font-mono text-text-secondary">
            {result.kind} · {result.intent} · {result.region_label}
          </span>
        </div>
        <span className="text-xs font-mono text-ai-match">{result.label}</span>
      </div>
      <p className="text-sm text-text-primary">{result.raw_text}</p>
      {result.tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {result.tags.map((t) => (
            <span
              key={t}
              className="text-xs font-mono text-text-secondary bg-background border border-border rounded-pill px-2 py-0.5"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
