"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, personaHeaders } from "@/lib/api";
import { clearPersona, getStoredPersona, Persona } from "@/lib/persona";
import { Signal, SignalPreview } from "@/lib/types";

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

export default function MePage() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [signals, setSignals] = useState<Signal[] | null>(null);
  const [rawText, setRawText] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState<SignalPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredPersona();
    if (!stored) {
      router.push("/login");
      return;
    }
    setPersona(stored);
  }, [router]);

  useEffect(() => {
    if (persona) refreshSignals(persona);
  }, [persona]);

  async function refreshSignals(p: Persona) {
    const res = await apiFetch<Signal[]>("/signals/mine", {
      headers: personaHeaders(p.id),
    });
    if (res.data) setSignals(res.data);
  }

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    if (!persona || !rawText.trim()) return;
    setAnalyzing(true);
    setError(null);
    setPreview(null);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const res = await apiFetch<SignalPreview>("/signals", {
      method: "POST",
      headers: personaHeaders(persona.id),
      body: JSON.stringify({ raw_text: rawText, tags }),
    });
    if (res.data) setPreview(res.data);
    else setError(res.error ?? "Could not analyze signal");
    setAnalyzing(false);
  }

  async function confirm() {
    if (!persona || !preview || preview.blocked) return;
    setConfirming(true);
    const res = await apiFetch<Signal>("/signals/confirm", {
      method: "POST",
      body: JSON.stringify({ preview_id: preview.preview_id }),
    });
    if (res.data) {
      setRawText("");
      setTagsInput("");
      setPreview(null);
      await refreshSignals(persona);
    } else {
      setError(res.error ?? "Could not confirm signal");
    }
    setConfirming(false);
  }

  function discardPreview() {
    setPreview(null);
  }

  function logout() {
    clearPersona();
    router.push("/login");
  }

  if (!persona) return null;

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="w-full max-w-lg mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-xl tracking-tight">
              SAME<span className="text-ai-match">WORLD</span>
            </h1>
            <p className="text-sm text-text-secondary font-mono mt-1">
              {persona.display_name} · {persona.region_label}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/explore"
              className="text-xs font-mono text-text-secondary hover:text-text-primary transition-colors duration-micro"
            >
              explore
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

        <div className="rounded-card border border-border bg-surface p-4 mb-8">
          <form onSubmit={analyze}>
            <textarea
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setPreview(null);
              }}
              placeholder="What's on your mind? A need, a question, an opinion, a plan…"
              rows={3}
              disabled={!!preview}
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-secondary resize-none focus:outline-none disabled:opacity-60"
            />
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="tags, comma, separated (optional)"
                disabled={!!preview}
                className="flex-1 bg-background border border-border rounded-card px-2 py-1 text-xs font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-ai-match disabled:opacity-60"
              />
              {!preview && (
                <button
                  type="submit"
                  disabled={analyzing || !rawText.trim()}
                  className="rounded-pill bg-ai-match text-background text-xs font-medium px-4 py-1.5 disabled:opacity-40 transition-opacity duration-micro whitespace-nowrap"
                >
                  {analyzing ? "Understanding…" : "Analyze"}
                </button>
              )}
            </div>
          </form>

          {error && <p className="mt-2 text-xs text-red-400 font-mono">{error}</p>}

          {preview?.blocked && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-sm text-red-400">This didn't clear the safety gate.</p>
              <p className="text-xs text-text-secondary font-mono mt-1">{preview.reason}</p>
              <button
                onClick={discardPreview}
                className="mt-3 text-xs font-mono text-text-secondary hover:text-text-primary transition-colors duration-micro"
              >
                edit and try again
              </button>
            </div>
          )}

          {preview && !preview.blocked && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-text-secondary font-mono mb-2">AI preview</p>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    preview.suggested_kind === "NOW" ? "bg-now" : "bg-open"
                  }`}
                />
                <span className="text-sm text-text-primary">
                  Reads as {INTENT_LABELS[preview.intent]} · {preview.suggested_kind}
                </span>
              </div>
              <p className="text-xs text-text-secondary mb-2">{preview.topic}</p>
              {preview.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-3">
                  {preview.tags.map((t) => (
                    <span
                      key={t}
                      className="text-xs font-mono text-text-secondary bg-background border border-border rounded-pill px-2 py-0.5"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={confirm}
                  disabled={confirming}
                  className="rounded-pill bg-ai-match text-background text-xs font-medium px-4 py-1.5 disabled:opacity-40 transition-opacity duration-micro"
                >
                  {confirming ? "Posting…" : "Confirm & Post"}
                </button>
                <button
                  onClick={discardPreview}
                  disabled={confirming}
                  className="rounded-pill border border-border text-text-secondary text-xs font-medium px-4 py-1.5 transition-colors duration-micro hover:text-text-primary"
                >
                  Edit
                </button>
              </div>
            </div>
          )}
        </div>

        <h2 className="text-sm text-text-secondary mb-3">My Signals</h2>
        <div className="space-y-2">
          {signals === null && (
            <p className="text-sm text-text-secondary font-mono">Loading…</p>
          )}
          {signals?.length === 0 && (
            <p className="text-sm text-text-secondary">
              No signals yet — post your first one above.
            </p>
          )}
          {signals?.map((s) => (
            <div
              key={s.id}
              className="rounded-card border border-border bg-surface p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    s.kind === "NOW" ? "bg-now" : "bg-open"
                  }`}
                />
                <span className="text-xs font-mono text-text-secondary">
                  {s.kind} · {s.intent} · {s.status}
                </span>
              </div>
              <p className="text-sm text-text-primary">{s.raw_text}</p>
              {s.tags.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {s.tags.map((t) => (
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
          ))}
        </div>
      </div>
    </main>
  );
}
