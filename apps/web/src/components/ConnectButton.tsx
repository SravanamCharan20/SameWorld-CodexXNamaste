"use client";

import { useState } from "react";
import { UserPlus, Send, X, CheckCircle2 } from "lucide-react";
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
    <div className="mt-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Say why you're reaching out…"
        rows={2}
        autoFocus
        className="input-base w-full text-xs resize-none"
      />
      {error && <p className="text-xs text-red-400 font-mono mt-1">{error}</p>}
      <div className="flex gap-2 mt-1.5">
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
