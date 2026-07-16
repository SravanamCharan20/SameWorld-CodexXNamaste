"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, MapPinned, SearchX } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getStoredPersona, Persona } from "@/lib/persona";
import { GlobePoint, SearchResponse, SearchResult } from "@/lib/types";
import ConnectButton from "@/components/ConnectButton";
import AppHeader from "@/components/AppHeader";

const GlobeCanvas = dynamic(() => import("@/components/GlobeCanvas"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center">
      <p className="text-sm text-text-secondary font-mono">Waking up the globe…</p>
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
  const searchParams = useSearchParams();
  const autoSearchedRef = useRef(false);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [points, setPoints] = useState<GlobePoint[]>([]);

  const [queryText, setQueryText] = useState("");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseRegion, setBrowseRegion] = useState("");
  const [browseResults, setBrowseResults] = useState<SearchResult[] | null>(null);
  const [browseError, setBrowseError] = useState<string | null>(null);

  const [selectedPoint, setSelectedPoint] = useState<{ point: GlobePoint; x: number; y: number } | null>(null);

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

  async function search(e?: React.FormEvent, overrideText?: string) {
    e?.preventDefault();
    const text = overrideText ?? queryText;
    if (!text.trim()) return;
    setSearching(true);
    setSearchError(null);
    setBrowseOpen(false);
    setSelectedPoint(null);
    const res = await apiFetch<SearchResponse>("/search", {
      method: "POST",
      body: JSON.stringify({ query_text: text }),
    });
    if (res.data) setSearchResponse(res.data);
    else setSearchError(res.error ?? "Search failed — try again.");
    setHasSearched(true);
    setSearching(false);
  }

  // The header's "?" help panel links to example searches via ?q=... — this
  // runs that search once the page (and persona) is ready, so the example is
  // actually a working demo, not just descriptive text.
  useEffect(() => {
    if (!persona || autoSearchedRef.current) return;
    const q = searchParams.get("q");
    if (!q) return;
    autoSearchedRef.current = true;
    setQueryText(q);
    search(undefined, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona, searchParams]);

  function clearSearch() {
    setQueryText("");
    setSearchResponse(null);
    setSearchError(null);
    setHasSearched(false);
  }

  // Browse Nearby defaults to the viewer's own region on first open — an
  // unfiltered global list read as "random" to testers, defeating the point
  // of a *nearby* browse. Still fully editable/clearable from there.
  async function runBrowse(regionOverride?: string) {
    setBrowseError(null);
    const region = regionOverride ?? browseRegion;
    const params = region ? `?region=${encodeURIComponent(region)}` : "";
    const res = await apiFetch<SearchResult[]>(`/signals/browse${params}`);
    if (!res.data) {
      setBrowseError(res.error ?? "Could not load nearby signals.");
      setBrowseResults([]);
      return;
    }
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

  function openBrowse() {
    setBrowseOpen(true);
    setSelectedPoint(null);
    const region = browseRegion || persona?.region_label || "";
    if (!browseRegion && region) setBrowseRegion(region);
    runBrowse(region);
  }

  function clearBrowseRegion() {
    setBrowseRegion("");
    runBrowse("");
  }

  function handlePointClick(point: GlobePoint, event: MouseEvent) {
    setSelectedPoint({ point, x: event.clientX, y: event.clientY });
  }

  // A cluster marker on the globe isn't a single signal, so clicking it
  // can't open the same detail popup — it opens Browse Nearby scoped to
  // that region instead, reusing the panel that already lists and filters
  // signals by place.
  function handleClusterClick(regionLabel: string) {
    setSelectedPoint(null);
    setBrowseOpen(true);
    setBrowseRegion(regionLabel);
    runBrowse(regionLabel);
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
          origin={{ lat: persona.region_lat, lng: persona.region_lng }}
          ownPersonaId={persona.id}
          onPointClick={handlePointClick}
          onClusterClick={handleClusterClick}
        />
      </div>

      <AppHeader persona={persona} active="explore" />

      {/* Page label + legend */}
      {!resultsPanelOpen && (
        <div className="fixed top-20 left-6 z-10 hidden sm:flex flex-col gap-3">
          <h1 className="text-sm font-heading font-bold text-text-primary">Explore</h1>
          <div className="flex flex-col gap-2 bg-surface/80 backdrop-blur border border-border rounded-card px-3 py-2.5">
            <LegendRow color="bg-now" label="happening now" />
            <LegendRow color="bg-open" label="open / ongoing" />
            <LegendRow color="bg-[#A78BFA]" label="your signals" />
          </div>
        </div>
      )}

      {/* Popup shown when a globe pin is clicked — the hover tooltip is
          read-only, so without this, clicking a pin did nothing at all. */}
      {selectedPoint && (
        <PointPopup
          point={selectedPoint.point}
          x={selectedPoint.x}
          y={selectedPoint.y}
          onClose={() => setSelectedPoint(null)}
        />
      )}

      {/* Bottom search dock */}
      <div className="fixed bottom-0 left-0 right-0 z-10 px-4 pb-6 pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto bg-surface/90 backdrop-blur border border-border rounded-card p-3 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
          <form onSubmit={search} className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
              />
              <input
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Search for a human — a need, a question, a plan, a mood…"
                className="w-full bg-background border border-border rounded-pill pl-10 pr-4 py-3 text-sm text-text-primary placeholder:text-text-secondary transition-colors duration-micro hover:border-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-ai-match focus:border-ai-match"
              />
            </div>
            <button type="submit" disabled={searching || !queryText.trim()} className="btn-primary px-6">
              {searching ? "…" : "Search"}
            </button>
            {hasSearched && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="btn-secondary px-3"
              >
                <X size={16} />
              </button>
            )}
          </form>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <button
              onClick={() => (browseOpen ? setBrowseOpen(false) : openBrowse())}
              className="nav-pill !text-text-primary bg-white/[0.04] border border-border"
            >
              <MapPinned size={13} />
              {browseOpen ? "Hide Browse Nearby" : "Browse Nearby"}
            </button>
            <span className="text-xs font-mono text-text-secondary px-2">
              {points.length} live signals
            </span>
          </div>
        </div>
      </div>

      {/* Slide-in results panel */}
      {resultsPanelOpen && (
        <div className="fixed top-0 right-0 bottom-0 z-20 w-full sm:w-96 bg-surface/95 backdrop-blur border-l border-border overflow-y-auto transition-transform duration-panel ease-out-expo">
          <div className="p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-medium text-text-primary">
                {browseOpen ? "Browse Nearby" : "Search Results"}
              </h2>
              <button
                onClick={() => {
                  clearSearch();
                  setBrowseOpen(false);
                }}
                className="link-muted flex items-center gap-1"
              >
                <X size={13} />
                close
              </button>
            </div>
            <p className="text-xs text-text-secondary mb-4">
              {browseOpen
                ? "Signals from a specific place, not filtered by relevance."
                : searchResponse && !searchResponse.empty
                ? `${searchResponse.results.length} ${searchResponse.results.length === 1 ? "person" : "people"} matched your search.`
                : "AI-matched to what you typed."}
            </p>

            {browseOpen && (
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    value={browseRegion}
                    onChange={(e) => setBrowseRegion(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runBrowse()}
                    placeholder="Region (e.g. Bangalore, India)"
                    className="input-base flex-1 font-mono text-xs"
                  />
                  <button onClick={() => runBrowse()} className="btn-secondary px-3 text-xs">
                    Filter
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-text-secondary font-mono">
                    {browseRegion ? `showing: ${browseRegion}` : "showing: worldwide"}
                  </p>
                  {browseRegion && (
                    <button onClick={clearBrowseRegion} className="btn-chip">
                      clear filter
                    </button>
                  )}
                </div>
              </div>
            )}

            {!browseOpen && searching && (
              <div className="space-y-2">
                <p className="text-sm text-text-secondary font-mono mb-3">
                  Understanding what you need…
                </p>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-20 w-full" />
                ))}
              </div>
            )}

            {!browseOpen && !searching && searchError && (
              <div className="card-base p-8 text-center flex flex-col items-center gap-3 !border-red-400/40">
                <SearchX size={28} className="text-red-400" />
                <p className="text-sm text-text-primary">{searchError}</p>
                <button onClick={search as unknown as () => void} className="btn-secondary text-xs px-4 py-1.5">
                  Retry
                </button>
              </div>
            )}

            {!browseOpen && !searching && !searchError && searchResponse?.empty && (
              <div className="card-base p-8 text-center flex flex-col items-center gap-3">
                <SearchX size={28} className="text-text-secondary" />
                <p className="text-sm text-text-primary">{searchResponse.message}</p>
              </div>
            )}

            {browseOpen && browseError && (
              <div className="card-base p-8 text-center flex flex-col items-center gap-3 !border-red-400/40 mb-2">
                <SearchX size={28} className="text-red-400" />
                <p className="text-sm text-text-primary">{browseError}</p>
                <button onClick={() => runBrowse()} className="btn-secondary text-xs px-4 py-1.5">
                  Retry
                </button>
              </div>
            )}

            {(browseOpen || !searching) && (
              <div className="space-y-2">
                {(browseOpen ? browseResults : searchResponse?.results)?.map((r) => (
                  <ResultCard key={r.signal_id} result={r} showLabel={!browseOpen} />
                ))}
                {browseOpen && browseResults === null && (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="skeleton h-20 w-full" />
                    ))}
                  </div>
                )}
                {browseOpen && !browseError && browseResults?.length === 0 && (
                  <div className="card-base p-8 text-center flex flex-col items-center gap-2">
                    <MapPinned size={24} className="text-text-secondary" />
                    <p className="text-sm text-text-secondary">
                      No active signals {browseRegion ? `in ${browseRegion}` : "right now"}.
                    </p>
                    {browseRegion && (
                      <button onClick={clearBrowseRegion} className="btn-chip">
                        browse worldwide instead
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

const POPUP_WIDTH = 288;
const POPUP_HEIGHT = 190;
const POPUP_MARGIN = 12;

function PointPopup({
  point,
  x,
  y,
  onClose,
}: {
  point: GlobePoint;
  x: number;
  y: number;
  onClose: () => void;
}) {
  const maxLeft = typeof window !== "undefined" ? window.innerWidth - POPUP_WIDTH - POPUP_MARGIN : x;
  const maxTop = typeof window !== "undefined" ? window.innerHeight - POPUP_HEIGHT - POPUP_MARGIN : y;
  const left = Math.min(Math.max(x - POPUP_WIDTH / 2, POPUP_MARGIN), Math.max(maxLeft, POPUP_MARGIN));
  const top = Math.min(Math.max(y - POPUP_HEIGHT - 20, POPUP_MARGIN), Math.max(maxTop, POPUP_MARGIN));

  const badgeClass =
    point.kind === "NOW" ? "badge-now" : point.kind === "OPEN" ? "badge-open" : "badge-profile";

  return (
    <>
      {/* invisible full-screen layer so clicking anywhere outside the card closes it */}
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div
        className="fixed z-30 card-base p-4 shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
        style={{ left, top, width: POPUP_WIDTH }}
      >
        <div className="flex items-center justify-between mb-2.5 gap-2">
          <span className={badgeClass}>{point.kind}</span>
          <button onClick={onClose} aria-label="Close" className="link-muted">
            <X size={13} />
          </button>
        </div>
        <p className="text-sm text-text-primary mb-1 leading-relaxed">{point.topic}</p>
        <p className="text-xs text-text-secondary font-mono mb-3">{point.region_label}</p>
        <div className="flex items-center gap-3 pt-2.5 border-t border-border/60">
          <a href={`/human/${point.owner_id}`} className="link-muted hover:!text-ai-match">
            view profile →
          </a>
          {!point.is_profile && <ConnectButton signalId={point.id} ownerId={point.owner_id} />}
        </div>
      </div>
    </>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full shrink-0 ${color}`} />
      <span className="text-[11px] font-mono text-text-secondary whitespace-nowrap">{label}</span>
    </div>
  );
}

function ResultCard({ result, showLabel }: { result: SearchResult; showLabel: boolean }) {
  const badgeClass =
    result.kind === "NOW" ? "badge-now" : result.kind === "OPEN" ? "badge-open" : "badge-profile";
  return (
    <div className="card-interactive p-4">
      <div className="flex items-center justify-between mb-2.5 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={badgeClass}>{result.kind}</span>
          <span className="text-xs text-text-secondary truncate">
            {INTENT_LABELS[result.intent] ?? result.intent} · {result.region_label}
          </span>
        </div>
        {showLabel && result.label && (
          <span className="text-xs font-mono text-ai-match shrink-0">{result.label}</span>
        )}
      </div>
      <p className="text-sm text-text-primary mb-3 leading-relaxed">{result.raw_text}</p>
      <div className="flex items-center gap-3 pt-2.5 border-t border-border/60">
        <a href={`/human/${result.owner_id}`} className="link-muted hover:!text-ai-match">
          view profile →
        </a>
        <ConnectButton signalId={result.signal_id} ownerId={result.owner_id} rationale={result.label} />
      </div>
    </div>
  );
}
