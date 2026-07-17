"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, MapPinned, SearchX, Sparkles, Radio } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getStoredPersona, Persona } from "@/lib/persona";
import { GlobePoint, NarrateResponse, SearchResponse, SearchResult } from "@/lib/types";
import ConnectButton from "@/components/ConnectButton";
import AppHeader from "@/components/AppHeader";
import Avatar from "@/components/Avatar";
import { PersonaInfo, usePersonaNames } from "@/lib/usePersonaNames";

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

// useSearchParams() opts a page out of static prerendering unless it's
// wrapped in Suspense — the actual page logic lives in ExplorePageInner so
// the default export can provide that boundary.
export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExplorePageInner />
    </Suspense>
  );
}

function ExplorePageInner() {
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
  const [narrating, setNarrating] = useState(false);
  const [narrateResult, setNarrateResult] = useState<NarrateResponse | null>(null);

  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseRegion, setBrowseRegion] = useState("");
  const [browseResults, setBrowseResults] = useState<SearchResult[] | null>(null);
  const [browseError, setBrowseError] = useState<string | null>(null);

  const [selectedPoint, setSelectedPoint] = useState<{ point: GlobePoint; x: number; y: number } | null>(null);

  const [tickerIndex, setTickerIndex] = useState(0);

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

  // Live Activity — a rotating ticker over the most recently posted signals,
  // computed entirely from the globe state already being polled (no extra
  // API call, no AI dependency — just what's actually new right now).
  const recentActivity = useMemo(() => {
    return [...points]
      .filter((p) => !p.is_profile && p.created_at)
      .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
      .slice(0, 10);
  }, [points]);

  useEffect(() => {
    if (recentActivity.length < 2) return;
    const interval = setInterval(() => setTickerIndex((i) => i + 1), 4000);
    return () => clearInterval(interval);
  }, [recentActivity.length]);

  const currentActivity = recentActivity.length > 0 ? recentActivity[tickerIndex % recentActivity.length] : null;

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
    setNarrateResult(null);
    const res = await apiFetch<SearchResponse>("/search", {
      method: "POST",
      body: JSON.stringify({ query_text: text }),
    });
    if (res.data) {
      setSearchResponse(res.data);
      // "Ask the World" — fired after the result list is already in hand, so
      // the (slower) AI narrative never blocks or risks the actual results;
      // it just fills in a card above them a moment later, or silently
      // doesn't if Groq is unavailable.
      if (!res.data.empty && res.data.results.length > 0) {
        askTheWorld(text, res.data.results.slice(0, 4).map((r) => r.signal_id));
      }
    } else {
      setSearchError(res.error ?? "Search failed — try again.");
    }
    setHasSearched(true);
    setSearching(false);
  }

  async function askTheWorld(text: string, signalIds: string[]) {
    setNarrating(true);
    const res = await apiFetch<NarrateResponse | null>("/search/narrate", {
      method: "POST",
      body: JSON.stringify({ query_text: text, signal_ids: signalIds }),
    });
    if (res.data) setNarrateResult(res.data);
    setNarrating(false);
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
    setNarrateResult(null);
    setNarrating(false);
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

  // The results panel used to force a click-through to "view profile" just
  // to see whose signal you were looking at — this fetches names up front so
  // every card/popup can show them in place.
  const people = usePersonaNames([
    ...(searchResponse?.results.map((r) => r.owner_id) ?? []),
    ...(browseResults?.map((r) => r.owner_id) ?? []),
    selectedPoint?.point.owner_id,
  ]);

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

      {/* Live Activity — a rotating ticker over the most recently posted
          signals. Phrased as an actual sentence (not just "region · topic",
          which read as a meaningless fragment) so it's legible at a glance. */}
      {currentActivity && !resultsPanelOpen && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-10 w-[92%] max-w-xl px-4">
          <div
            className={`flex items-center gap-2.5 w-full overflow-hidden bg-surface/85 backdrop-blur-xl border rounded-pill px-4 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.35)] ${
              currentActivity.kind === "NOW" ? "border-now/30" : "border-open/30"
            }`}
          >
            <Radio
              size={13}
              className={`shrink-0 ${currentActivity.kind === "NOW" ? "text-now" : "text-open"}`}
            />
            <span
              className={`text-[10px] font-mono font-semibold uppercase tracking-wide shrink-0 ${
                currentActivity.kind === "NOW" ? "text-now" : "text-open"
              }`}
            >
              Live
            </span>
            <span key={currentActivity.id} className="min-w-0 flex-1 text-xs text-text-primary truncate animate-ticker-fade">
              {currentActivity.kind === "NOW" ? "Happening now in" : "Ongoing in"}{" "}
              {currentActivity.region_label} — {currentActivity.topic}
            </span>
          </div>
        </div>
      )}

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
          person={people[selectedPoint.point.owner_id]}
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
        <div className="fixed top-24 left-4 right-4 bottom-6 sm:left-auto sm:right-6 sm:w-[26rem] z-20 bg-surface/95 backdrop-blur-xl border border-border/50 rounded-card shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-y-auto transition-transform duration-panel ease-out-expo">
          <div className="px-7 py-8">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h2 className="text-xl font-heading font-bold text-text-primary tracking-tight">
                {browseOpen ? "Browse Nearby" : "Search Results"}
              </h2>
              <button
                onClick={() => {
                  clearSearch();
                  setBrowseOpen(false);
                }}
                aria-label="Close"
                className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-text-secondary cursor-pointer hover:text-text-primary hover:bg-white/[0.07] transition-colors duration-micro"
              >
                <X size={15} />
              </button>
            </div>
            <p className="text-sm text-text-secondary mb-7 leading-relaxed">
              {browseOpen
                ? "Signals from a specific place, not filtered by relevance."
                : searchResponse && !searchResponse.empty
                ? `${searchResponse.results.length} ${searchResponse.results.length === 1 ? "person" : "people"} matched your search.`
                : "AI-matched to what you typed."}
            </p>

            {!browseOpen && (narrating || narrateResult) && (
              <div className="card-base !border-ai-match/25 bg-gradient-to-br from-ai-match/[0.09] to-transparent p-5 mb-5">
                <div className="flex items-center gap-1.5 mb-3">
                  <Sparkles size={13} className="text-ai-match" />
                  <span className="text-xs font-mono text-ai-match font-medium">Ask the World</span>
                </div>
                {narrating && !narrateResult && (
                  <div className="space-y-2">
                    <div className="skeleton h-3.5 w-full" />
                    <div className="skeleton h-3.5 w-5/6" />
                    <div className="skeleton h-3.5 w-2/3" />
                  </div>
                )}
                {narrateResult && (
                  <>
                    <p className="text-sm text-text-primary leading-relaxed mb-4">
                      {narrateResult.narrative}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {narrateResult.citations.map((c) => (
                        <a
                          key={c.signal_id}
                          href={`/human/${c.owner_id}`}
                          className="text-[11px] font-mono text-ai-match bg-ai-match/10 border border-ai-match/25 rounded-pill px-2.5 py-1.5 no-underline hover:bg-ai-match/20 hover:border-ai-match/50 transition-colors duration-micro"
                        >
                          {c.display_name} · {c.region_label}
                        </a>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {browseOpen && (
              <div className="mb-6">
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
              <div className="space-y-3">
                {(browseOpen ? browseResults : searchResponse?.results)?.map((r) => (
                  <ResultCard key={r.signal_id} result={r} person={people[r.owner_id]} />
                ))}
                {browseOpen && browseResults === null && (
                  <div className="space-y-3">
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

const POPUP_WIDTH = 300;
const POPUP_HEIGHT = 210;
const POPUP_MARGIN = 12;

function PointPopup({
  point,
  person,
  x,
  y,
  onClose,
}: {
  point: GlobePoint;
  person?: PersonaInfo;
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
  const name = person?.display_name ?? "…";

  return (
    <>
      {/* invisible full-screen layer so clicking anywhere outside the card closes it */}
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div
        className="fixed z-30 card-base p-5 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
        style={{ left, top, width: POPUP_WIDTH }}
      >
        <div className="flex items-start justify-between mb-3 gap-2">
          <a
            href={`/human/${point.owner_id}`}
            className="flex items-center gap-2.5 min-w-0 no-underline hover:opacity-80 transition-opacity"
          >
            <Avatar name={name} size={30} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{name}</p>
              <p className="text-xs text-text-secondary truncate">{point.region_label}</p>
            </div>
          </a>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-text-secondary cursor-pointer hover:text-text-primary hover:bg-white/[0.07] transition-colors duration-micro"
          >
            <X size={13} />
          </button>
        </div>
        <span className={badgeClass}>{point.kind}</span>
        <p className="text-sm text-text-primary mt-2.5 mb-4 leading-relaxed">{point.topic}</p>
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border/50">
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

function ResultCard({ result, person }: { result: SearchResult; person?: PersonaInfo }) {
  const badgeClass =
    result.kind === "NOW" ? "badge-now" : result.kind === "OPEN" ? "badge-open" : "badge-profile";
  const name = person?.display_name ?? "…";
  return (
    <div className="card-interactive p-5">
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <a
          href={`/human/${result.owner_id}`}
          className="flex items-center gap-2.5 min-w-0 no-underline hover:opacity-80 transition-opacity"
        >
          <Avatar name={name} size={32} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{name}</p>
            <p className="text-xs text-text-secondary truncate">
              {result.region_label} · {INTENT_LABELS[result.intent] ?? result.intent}
            </p>
          </div>
        </a>
        <span className={`${badgeClass} shrink-0`}>{result.kind}</span>
      </div>
      <p className="text-sm text-text-primary leading-relaxed mb-3.5">{result.raw_text}</p>
      {result.label && (
        <p className="text-xs font-mono text-ai-match mb-4">✨ {result.label}</p>
      )}
      <div className="flex flex-wrap items-center gap-4 pt-3.5 border-t border-border/50">
        <a href={`/human/${result.owner_id}`} className="link-muted hover:!text-ai-match">
          view profile →
        </a>
        <ConnectButton signalId={result.signal_id} ownerId={result.owner_id} rationale={result.label} />
      </div>
    </div>
  );
}
