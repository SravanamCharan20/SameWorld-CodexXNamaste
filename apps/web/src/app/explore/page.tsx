"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { clearPersona, getStoredPersona, Persona } from "@/lib/persona";
import { ActivityItem, GlobePoint, SearchResponse, SearchResult } from "@/lib/types";
import ConnectButton from "@/components/ConnectButton";

const GlobeCanvas = dynamic(() => import("@/components/GlobeCanvas"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center">
      <p className="text-sm text-text-secondary font-mono">Loading the globe…</p>
    </div>
  ),
});

const INTENT_LABELS: Record<string, string> = {
  need: "a need",
  offer: "an offer",
  question: "a question",
  experience: "an experience",
  goal: "a goal",
  opinion: "an opinion",
  moment: "a moment",
  other: "something",
};

export default function ExplorePage() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [points, setPoints] = useState<GlobePoint[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const [queryText, setQueryText] = useState("");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);

  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseRegion, setBrowseRegion] = useState("");
  const [browseResults, setBrowseResults] = useState<SearchResult[] | null>(null);

  useEffect(() => {
    const stored = getStoredPersona();
    if (!stored) {
      router.push("/login");
      return;
    }
    setPersona(stored);
  }, [router]);

  useEffect(() => {
    async function loadGlobe() {
      const res = await apiFetch<GlobePoint[]>("/globe/state");
      if (res.data) setPoints(res.data);
    }
    loadGlobe();
    const interval = setInterval(loadGlobe, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadActivity() {
      const res = await apiFetch<ActivityItem[]>("/activity/recent?limit=8");
      if (res.data) setActivity(res.data);
    }
    loadActivity();
    const interval = setInterval(loadActivity, 30000);
    return () => clearInterval(interval);
  }, []);

  const highlightedIds = useMemo(() => {
    if (!searchResponse || searchResponse.empty) return new Set<string>();
    return new Set(searchResponse.results.map((r) => r.signal_id));
  }, [searchResponse]);

  const focusTarget = useMemo(() => {
    if (highlightedIds.size === 0) return null;
    const matched = points.filter((p) => highlightedIds.has(p.id));
    if (matched.length === 0) return null;
    const lat = matched.reduce((sum, p) => sum + p.lat, 0) / matched.length;
    const lng = matched.reduce((sum, p) => sum + p.lng, 0) / matched.length;
    return { lat, lng };
  }, [points, highlightedIds]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!queryText.trim()) return;
    setSearching(true);
    setBrowseOpen(false);
    const res = await apiFetch<SearchResponse>("/search", {
      method: "POST",
      body: JSON.stringify({ query_text: queryText }),
    });
    if (res.data) setSearchResponse(res.data);
    setHasSearched(true);
    setSearching(false);
  }

  function clearSearch() {
    setQueryText("");
    setSearchResponse(null);
    setHasSearched(false);
  }

  async function runBrowse() {
    const params = browseRegion ? `?region=${encodeURIComponent(browseRegion)}` : "";
    const res = await apiFetch<SearchResult[]>(`/signals/browse${params}`);
    if (res.data) {
      setBrowseResults(
        res.data.map((s: unknown) => {
          const signal = s as { id: string; owner_id: string; raw_text: string; topic: string; intent: string; kind: string; tags: string[]; region_label: string; is_profile: boolean };
          return {
            signal_id: signal.id,
            owner_id: signal.owner_id,
            raw_text: signal.raw_text,
            topic: signal.topic,
            intent: signal.intent as SearchResult["intent"],
            kind: signal.kind as SearchResult["kind"],
            tags: signal.tags,
            region_label: signal.region_label,
            is_profile: signal.is_profile,
            score: 0,
            similarity: 0,
            label: "",
          };
        })
      );
    }
  }

  function logout() {
    clearPersona();
    router.push("/login");
  }

  if (!persona) return null;

  const resultsPanelOpen = hasSearched || browseOpen;

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background">
      <div className="fixed inset-0">
        <GlobeCanvas
          points={points}
          highlightedIds={highlightedIds}
          dimmed={hasSearched && !!searchResponse && !searchResponse.empty}
          focusTarget={focusTarget}
        />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5">
        <h1 className="font-heading font-bold text-lg tracking-tight">
          SAME<span className="text-ai-match">WORLD</span>
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-text-secondary hidden sm:inline">
            {persona.display_name} · {persona.region_label}
          </span>
          <a
            href="/me"
            className="text-xs font-mono text-text-secondary hover:text-text-primary transition-colors duration-micro"
          >
            my signals
          </a>
          <a
            href="/connections"
            className="text-xs font-mono text-text-secondary hover:text-text-primary transition-colors duration-micro"
          >
            connections
          </a>
          <button
            onClick={logout}
            className="text-xs font-mono text-text-secondary hover:text-text-primary transition-colors duration-micro"
          >
            switch persona
          </button>
        </div>
      </div>

      {/* Bottom search dock */}
      <div className="fixed bottom-0 left-0 right-0 z-10 px-4 pb-6 pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto">
          <form onSubmit={search} className="flex gap-2 mb-3">
            <input
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search for a human — a need, a question, a plan, a mood…"
              className="flex-1 bg-surface/90 backdrop-blur border border-border rounded-pill px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-ai-match"
            />
            <button
              type="submit"
              disabled={searching || !queryText.trim()}
              className="rounded-pill bg-ai-match text-background text-sm font-medium px-6 disabled:opacity-40 transition-opacity duration-micro"
            >
              {searching ? "…" : "Search"}
            </button>
            {hasSearched && (
              <button
                type="button"
                onClick={clearSearch}
                className="rounded-pill border border-border bg-surface/90 backdrop-blur text-text-secondary text-sm px-4 hover:text-text-primary transition-colors duration-micro"
              >
                Clear
              </button>
            )}
          </form>

          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setBrowseOpen((v) => !v);
                if (!browseOpen) runBrowse();
              }}
              className="text-xs font-mono text-text-secondary hover:text-text-primary bg-surface/90 backdrop-blur border border-border rounded-pill px-3 py-1.5 transition-colors duration-micro"
            >
              {browseOpen ? "Hide Browse Nearby" : "Browse Nearby"}
            </button>
            <span className="text-xs font-mono text-text-secondary bg-surface/70 backdrop-blur rounded-pill px-3 py-1.5">
              {points.length} live signals
            </span>
          </div>

          {!resultsPanelOpen && activity.length > 0 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {activity.map((a) => (
                <div
                  key={a.id}
                  className="shrink-0 bg-surface/80 backdrop-blur border border-border rounded-card px-3 py-2 max-w-[220px]"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        a.kind === "NOW" ? "bg-now" : "bg-open"
                      }`}
                    />
                    <span className="text-[10px] font-mono text-text-secondary">
                      {a.region_label}
                    </span>
                  </div>
                  <p className="text-xs text-text-primary truncate">{a.raw_text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Slide-in results panel */}
      {resultsPanelOpen && (
        <div className="fixed top-0 right-0 bottom-0 z-20 w-full sm:w-96 bg-surface/95 backdrop-blur border-l border-border overflow-y-auto transition-transform duration-panel ease-out-expo">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm text-text-secondary">
                {browseOpen ? "Browse Nearby" : "Search Results"}
              </h2>
              <button
                onClick={() => {
                  clearSearch();
                  setBrowseOpen(false);
                }}
                className="text-xs font-mono text-text-secondary hover:text-text-primary transition-colors duration-micro"
              >
                close
              </button>
            </div>

            {browseOpen && (
              <div className="mb-4">
                <input
                  value={browseRegion}
                  onChange={(e) => setBrowseRegion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runBrowse()}
                  placeholder="Filter by region (optional)"
                  className="w-full bg-background border border-border rounded-card px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-ai-match"
                />
              </div>
            )}

            {searching && (
              <p className="text-sm text-text-secondary font-mono">Understanding what you need…</p>
            )}

            {!browseOpen && !searching && searchResponse?.empty && (
              <div className="rounded-card border border-border bg-background p-6 text-center">
                <p className="text-sm text-text-primary mb-1">{searchResponse.message}</p>
              </div>
            )}

            {!searching && (
              <div className="space-y-2">
                {(browseOpen ? browseResults : searchResponse?.results)?.map((r) => (
                  <ResultCard key={r.signal_id} result={r} showLabel={!browseOpen} />
                ))}
                {browseOpen && browseResults?.length === 0 && (
                  <p className="text-sm text-text-secondary">No active signals in this region yet.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function ResultCard({ result, showLabel }: { result: SearchResult; showLabel: boolean }) {
  return (
    <div className="rounded-card border border-border bg-background p-4">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${
              result.kind === "NOW" ? "bg-now" : result.kind === "OPEN" ? "bg-open" : "bg-ai-match"
            }`}
          />
          <span className="text-xs font-mono text-text-secondary truncate">
            {result.kind} · {INTENT_LABELS[result.intent] ?? result.intent} · {result.region_label}
          </span>
        </div>
        {showLabel && result.label && (
          <span className="text-xs font-mono text-ai-match shrink-0">{result.label}</span>
        )}
      </div>
      <p className="text-sm text-text-primary mb-2">{result.raw_text}</p>
      <div className="flex items-center gap-3">
        <a
          href={`/human/${result.owner_id}`}
          className="text-xs font-mono text-text-secondary hover:text-ai-match transition-colors duration-micro"
        >
          view profile →
        </a>
        <ConnectButton signalId={result.signal_id} ownerId={result.owner_id} rationale={result.label} />
      </div>
    </div>
  );
}
