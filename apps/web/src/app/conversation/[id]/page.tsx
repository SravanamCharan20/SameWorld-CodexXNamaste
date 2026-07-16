"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, personaHeaders } from "@/lib/api";
import { getStoredPersona, Persona } from "@/lib/persona";
import { Conversation } from "@/lib/types";

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reported, setReported] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = getStoredPersona();
    if (!stored) {
      router.push("/login");
      return;
    }
    setPersona(stored);
  }, [router]);

  useEffect(() => {
    if (!persona) return;
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages.length]);

  async function load() {
    if (!persona) return;
    const res = await apiFetch<Conversation>(`/conversations/${params.id}`, {
      headers: personaHeaders(persona.id),
    });
    if (res.data) setConversation(res.data);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!persona || !text.trim()) return;
    setSending(true);
    const res = await apiFetch<Conversation>(`/conversations/${params.id}/messages`, {
      method: "POST",
      headers: personaHeaders(persona.id),
      body: JSON.stringify({ text }),
    });
    if (res.data) {
      setConversation(res.data);
      setText("");
    }
    setSending(false);
  }

  async function resolve() {
    if (!persona || !conversation) return;
    setResolving(true);
    const res = await apiFetch(`/signals/${conversation.pinned_context.signal_id}/resolve`, {
      method: "POST",
      headers: personaHeaders(persona.id),
    });
    if (res.data) setResolved(true);
    setResolving(false);
  }

  async function endConversation() {
    if (!persona) return;
    const res = await apiFetch<Conversation>(`/conversations/${params.id}/end`, {
      method: "PATCH",
      headers: personaHeaders(persona.id),
    });
    if (res.data) setConversation(res.data);
  }

  async function submitReport() {
    if (!persona) return;
    await apiFetch(`/conversations/${params.id}/report`, {
      method: "POST",
      headers: personaHeaders(persona.id),
      body: JSON.stringify({ reason: reportReason }),
    });
    setReported(true);
    setShowReport(false);
  }

  if (!persona || !conversation) return null;

  const canResolve = conversation.pinned_context.owner_id === persona.id;
  const isEnded = conversation.status === "ended";

  return (
    <main className="min-h-screen flex flex-col">
      <div className="px-4 py-5 flex items-center justify-between border-b border-border">
        <a
          href="/connections"
          className="text-xs font-mono text-text-secondary hover:text-text-primary transition-colors duration-micro"
        >
          ← connections
        </a>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowReport(true)}
            className="text-xs font-mono text-text-secondary hover:text-red-400 transition-colors duration-micro"
          >
            report
          </button>
          {!isEnded && (
            <button
              onClick={endConversation}
              className="text-xs font-mono text-text-secondary hover:text-red-400 transition-colors duration-micro"
            >
              end conversation
            </button>
          )}
        </div>
      </div>

      <div
        className={`mx-4 mt-4 rounded-card border p-4 transition-opacity duration-panel ${
          resolved ? "opacity-40 border-resolved" : "border-ai-match/40"
        }`}
      >
        <span className="text-xs font-mono text-ai-match">
          {conversation.pinned_context.is_profile ? "PROFILE" : "SIGNAL"} ·{" "}
          {conversation.pinned_context.rationale}
        </span>
        <p className="text-sm text-text-primary mt-1">{conversation.pinned_context.raw_text}</p>
      </div>

      {showReport && (
        <div className="mx-4 mt-3 rounded-card border border-red-400/40 bg-surface p-4">
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="What's wrong? (optional)"
            rows={2}
            className="w-full bg-background border border-border rounded-card px-3 py-2 text-xs text-text-primary resize-none focus:outline-none focus:ring-1 focus:ring-red-400"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={submitReport}
              className="rounded-pill bg-red-500 text-background text-xs font-medium px-4 py-1.5"
            >
              Submit report
            </button>
            <button
              onClick={() => setShowReport(false)}
              className="rounded-pill border border-border text-text-secondary text-xs font-medium px-4 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {reported && (
        <p className="mx-4 mt-2 text-xs text-text-secondary font-mono">Report submitted. Thank you.</p>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {conversation.messages.map((m, i) => {
          const mine = m.sender_id === persona.id;
          return (
            <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-card px-3 py-2 text-sm ${
                  mine ? "bg-ai-match text-background" : "bg-surface border border-border text-text-primary"
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}
        {conversation.messages.length === 0 && (
          <p className="text-sm text-text-secondary text-center mt-8">
            Say hello — this is the start of your conversation.
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-4 border-t border-border">
        {resolved ? (
          <p className="text-sm text-now font-mono text-center">
            Resolved — success isn&apos;t time spent, it&apos;s needs resolved.
          </p>
        ) : isEnded ? (
          <p className="text-sm text-text-secondary text-center">This conversation has ended.</p>
        ) : (
          <>
            <form onSubmit={send} className="flex gap-2 mb-3">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 bg-surface border border-border rounded-pill px-4 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-ai-match"
              />
              <button
                type="submit"
                disabled={sending || !text.trim()}
                className="rounded-pill bg-ai-match text-background text-sm font-medium px-5 disabled:opacity-40 transition-opacity duration-micro"
              >
                Send
              </button>
            </form>
            {canResolve && (
              <button
                onClick={resolve}
                disabled={resolving}
                className="w-full rounded-pill border border-now text-now text-sm font-medium py-2 disabled:opacity-40 transition-opacity duration-micro"
              >
                {resolving ? "…" : "I found what I needed"}
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}
