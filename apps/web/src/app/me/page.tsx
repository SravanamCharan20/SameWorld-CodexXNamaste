"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, personaHeaders } from "@/lib/api";
import { clearPersona, getStoredPersona, Persona } from "@/lib/persona";
import { Signal, SignalKind } from "@/lib/types";

export default function MePage() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [signals, setSignals] = useState<Signal[] | null>(null);
  const [rawText, setRawText] = useState("");
  const [kind, setKind] = useState<SignalKind>("NOW");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!persona || !rawText.trim()) return;
    setSubmitting(true);
    setError(null);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const res = await apiFetch<Signal>("/signals", {
      method: "POST",
      headers: personaHeaders(persona.id),
      body: JSON.stringify({ raw_text: rawText, kind, tags }),
    });
    if (res.data) {
      setRawText("");
      setTagsInput("");
      await refreshSignals(persona);
    } else {
      setError(res.error ?? "Could not create signal");
    }
    setSubmitting(false);
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
          <button
            onClick={logout}
            className="text-xs font-mono text-text-secondary hover:text-text-primary transition-colors duration-micro"
          >
            switch persona
          </button>
        </div>

        <form
          onSubmit={submit}
          className="rounded-card border border-border bg-surface p-4 mb-8"
        >
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="What's on your mind? A need, a question, an opinion, a plan…"
            rows={3}
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-secondary resize-none focus:outline-none"
          />
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as SignalKind)}
              className="bg-background border border-border rounded-card px-2 py-1 text-xs font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-ai-match"
            >
              <option value="NOW">NOW · 24h</option>
              <option value="OPEN">OPEN · 30d</option>
            </select>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="tags, comma, separated"
              className="flex-1 bg-background border border-border rounded-card px-2 py-1 text-xs font-mono text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-ai-match"
            />
            <button
              type="submit"
              disabled={submitting || !rawText.trim()}
              className="rounded-pill bg-ai-match text-background text-xs font-medium px-4 py-1.5 disabled:opacity-40 transition-opacity duration-micro"
            >
              {submitting ? "Posting…" : "Post Signal"}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-400 font-mono">{error}</p>}
        </form>

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
                  {s.kind} · {s.status}
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
