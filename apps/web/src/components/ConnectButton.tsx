"use client";

import { useState } from "react";
import { UserPlus, Send, X, CheckCircle2, Sparkles } from "lucide-react";
import { apiFetch, personaHeaders } from "@/lib/api";
import { getStoredPersona } from "@/lib/persona";
import { Connection } from "@/lib/types";

type IcebreakerResponse = { suggestions: string[] };

export default function ConnectButton({
  signalId,
  ownerId,
  rationale,
}: {
  signalId: string;
  ownerId: string;
  rationale?: string;
}) {
  const persona = getStoredPersona();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);

  if (!persona || persona.id === ownerId) return null;

  async function send() {
    if (!persona || !message.trim()) return;
    setSending(true);
    setError(null);
    const res = await apiFetch<Connection>("/connections", {
      method: "POST",
      headers: personaHeaders(persona.id),
      body: JSON.stringify({ signal_id: signalId, message, rationale }),
    });
    if (res.data) {
      setSent(true);
      setOpen(false);
    } else {
      setError(res.error ?? "Could not send request");
    }
    setSending(false);
  }

  // A blank "why are you reaching out" box is where most connect attempts
  // stall — this gives 2 concrete, specific openers to start from (or
  // ignore). Purely optional: if Groq is slow or unavailable, the connect
  // flow itself is completely unaffected, just without suggestions.
  async function suggest() {
    if (!persona) return;
    setSuggesting(true);
    setSuggestions(null);
    const res = await apiFetch<IcebreakerResponse | null>("/connections/icebreaker", {
      method: "POST",
      headers: personaHeaders(persona.id),
      body: JSON.stringify({ signal_id: signalId }),
    });
    if (res.data) setSuggestions(res.data.suggestions);
    setSuggesting(false);
  }

  if (sent) {
    return (
      <p className="text-xs font-mono text-now flex items-center gap-1">
        <CheckCircle2 size={13} />
        Request sent.
      </p>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-chip hover:!text-ai-match hover:!border-ai-match/70">
        <UserPlus size={13} />
        connect
      </button>
    );
  }

  return (
    <div className="mt-2 w-full basis-full">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Say why you're reaching out…"
        rows={2}
        autoFocus
        className="input-base w-full text-xs resize-none"
      />

      {!suggestions && !suggesting && (
        <button onClick={suggest} className="btn-chip mt-2 !text-ai-match hover:!border-ai-match/60">
          <Sparkles size={11} />
          suggest an opener
        </button>
      )}
      {suggesting && (
        <p className="mt-2 text-[11px] font-mono text-text-secondary flex items-center gap-1">
          <Sparkles size={11} className="animate-pulse" />
          thinking of something specific…
        </p>
      )}
      {suggestions && suggestions.length > 0 && (
        <div className="mt-1.5 flex flex-col gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setMessage(s)}
              className="text-left text-xs text-text-primary bg-ai-match/10 border border-ai-match/25 rounded-card px-2.5 py-1.5 cursor-pointer hover:bg-ai-match/20 hover:border-ai-match/50 transition-colors duration-micro"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-400 font-mono mt-1.5">{error}</p>}
      <div className="flex gap-2 mt-2">
        <button
          onClick={send}
          disabled={sending || !message.trim()}
          className="btn-primary px-3 py-1 text-xs flex items-center gap-1"
        >
          <Send size={12} />
          {sending ? "…" : "Send"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="btn-secondary px-3 py-1 text-xs flex items-center gap-1"
        >
          <X size={12} />
          Cancel
        </button>
      </div>
    </div>
  );
}
