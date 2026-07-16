"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Sparkles, Inbox, CheckCircle2 } from "lucide-react";
import { apiFetch, personaHeaders } from "@/lib/api";
import { getStoredPersona, Persona } from "@/lib/persona";
import { Signal, SignalPreview } from "@/lib/types";
import AppHeader from "@/components/AppHeader";
import PageHeading from "@/components/PageHeading";

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
  const [resolvingId, setResolvingId] = useState<string | null>(null);
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

  async function resolve(signalId: string) {
    if (!persona) return;
    setResolvingId(signalId);
    const res = await apiFetch<Signal>(`/signals/${signalId}/resolve`, {
      method: "POST",
      headers: personaHeaders(persona.id),
    });
    if (res.data) await refreshSignals(persona);
    setResolvingId(null);
  }

  function discardPreview() {
    setPreview(null);
  }

  if (!persona) return null;

  return (
    <main className="min-h-screen">
      <AppHeader persona={persona} active="signals" />
      <div className="w-full max-w-lg mx-auto px-4 py-8">
        <PageHeading title="My Signals" subtitle="What you're posting to the world right now." />
        <div className="card-base p-4 mb-8">
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
                className="input-base flex-1 text-xs font-mono disabled:opacity-60"
              />
              {!preview && (
                <button
                  type="submit"
                  disabled={analyzing || !rawText.trim()}
                  className="btn-primary px-4 py-1.5 text-xs whitespace-nowrap"
                >
                  {analyzing ? "Understanding…" : "Analyze"}
                </button>
              )}
            </div>
          </form>

          {error && <p className="mt-2 text-xs text-red-400 font-mono">{error}</p>}

          {preview?.blocked && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-sm text-red-400 flex items-center gap-1.5">
                <ShieldAlert size={14} />
                This didn&apos;t clear the safety gate.
              </p>
              <p className="text-xs text-text-secondary font-mono mt-1">{preview.reason}</p>
              <button onClick={discardPreview} className="btn-chip mt-3">
                edit and try again
              </button>
            </div>
          )}

          {preview && !preview.blocked && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-text-secondary font-mono mb-2 flex items-center gap-1.5">
                <Sparkles size={12} />
                AI preview
              </p>
              <div className="flex items-center gap-2 mb-2">
                <span className={preview.suggested_kind === "NOW" ? "badge-now" : "badge-open"}>
                  {preview.suggested_kind}
                </span>
                <span className="text-sm text-text-primary">
                  Reads as {INTENT_LABELS[preview.intent]}
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
                <button onClick={confirm} disabled={confirming} className="btn-primary px-4 py-1.5 text-xs">
                  {confirming ? "Posting…" : "Confirm & Post"}
                </button>
                <button onClick={discardPreview} disabled={confirming} className="btn-secondary px-4 py-1.5 text-xs">
                  Edit
                </button>
              </div>
            </div>
          )}
        </div>

        <h2 className="text-sm font-medium text-text-secondary mb-3">Your history</h2>
        <div className="space-y-2">
          {signals === null && (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="skeleton h-20 w-full" />
              ))}
            </div>
          )}
          {signals?.length === 0 && (
            <div className="card-base p-8 text-center flex flex-col items-center gap-2">
              <Inbox size={24} className="text-text-secondary" />
              <p className="text-sm text-text-secondary">No signals yet — post your first one above.</p>
            </div>
          )}
          {signals?.map((s) => (
            <div key={s.id} className="card-base p-4">
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={
                      s.status === "resolved"
                        ? "badge bg-resolved/15 text-resolved"
                        : s.kind === "PROFILE"
                        ? "badge-profile"
                        : s.kind === "NOW"
                        ? "badge-now"
                        : "badge-open"
                    }
                  >
                    {s.status === "resolved" ? "resolved" : s.kind}
                  </span>
                  <span className="text-xs text-text-secondary truncate">{s.intent}</span>
                </div>
                {s.status === "active" && !s.is_profile && (
                  <button
                    onClick={() => resolve(s.id)}
                    disabled={resolvingId === s.id}
                    className="btn-chip hover:!text-now hover:!border-now/70"
                  >
                    <CheckCircle2 size={13} />
                    {resolvingId === s.id ? "…" : "resolve"}
                  </button>
                )}
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
