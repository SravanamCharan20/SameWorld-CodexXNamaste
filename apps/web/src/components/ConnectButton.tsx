"use client";

import { useState } from "react";
import { apiFetch, personaHeaders } from "@/lib/api";
import { getStoredPersona } from "@/lib/persona";
import { Connection } from "@/lib/types";

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

  if (sent) {
    return <p className="text-xs font-mono text-now">Request sent.</p>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-mono text-ai-match hover:underline"
      >
        connect →
      </button>
    );
  }

  return (
    <div className="mt-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Say why you're reaching out…"
        rows={2}
        className="w-full bg-background border border-border rounded-card px-2 py-1.5 text-xs text-text-primary placeholder:text-text-secondary resize-none focus:outline-none focus:ring-1 focus:ring-ai-match"
      />
      {error && <p className="text-xs text-red-400 font-mono mt-1">{error}</p>}
      <div className="flex gap-2 mt-1.5">
        <button
          onClick={send}
          disabled={sending || !message.trim()}
          className="rounded-pill bg-ai-match text-background text-xs font-medium px-3 py-1 disabled:opacity-40 transition-opacity duration-micro"
        >
          {sending ? "…" : "Send"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-pill border border-border text-text-secondary text-xs font-medium px-3 py-1"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
