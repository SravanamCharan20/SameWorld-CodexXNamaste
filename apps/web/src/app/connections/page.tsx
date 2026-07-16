"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, personaHeaders } from "@/lib/api";
import { getStoredPersona, Persona } from "@/lib/persona";
import { Connection } from "@/lib/types";

type Tab = "incoming" | "outgoing" | "accepted";

export default function ConnectionsPage() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [tab, setTab] = useState<Tab>("incoming");
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredPersona();
    if (!stored) {
      router.push("/login");
      return;
    }
    setPersona(stored);
  }, [router]);

  useEffect(() => {
    if (persona) load();
  }, [persona, tab]);

  async function load() {
    if (!persona) return;
    setConnections(null);
    const params =
      tab === "accepted"
        ? "status=accepted"
        : tab === "incoming"
        ? "direction=incoming&status=pending"
        : "direction=outgoing";
    const res = await apiFetch<Connection[]>(`/connections?${params}`, {
      headers: personaHeaders(persona.id),
    });
    setConnections(res.data ?? []);
  }

  async function respond(id: string, action: "accept" | "decline") {
    if (!persona) return;
    setBusyId(id);
    const res = await apiFetch<Connection>(`/connections/${id}`, {
      method: "PATCH",
      headers: personaHeaders(persona.id),
      body: JSON.stringify({ action }),
    });
    if (res.data && action === "accept" && res.data.conversation_id) {
      router.push(`/conversation/${res.data.conversation_id}`);
      return;
    }
    await load();
    setBusyId(null);
  }

  if (!persona) return null;

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="w-full max-w-lg mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-heading font-bold text-xl tracking-tight">
            SAME<span className="text-ai-match">WORLD</span>
          </h1>
          <a
            href="/explore"
            className="text-xs font-mono text-text-secondary hover:text-text-primary transition-colors duration-micro"
          >
            explore
          </a>
        </div>

        <div className="flex gap-1 mb-6 border-b border-border">
          {(["incoming", "outgoing", "accepted"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm capitalize border-b-2 transition-colors duration-micro ${
                tab === t
                  ? "border-ai-match text-text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {connections === null && (
            <p className="text-sm text-text-secondary font-mono">Loading…</p>
          )}
          {connections?.length === 0 && (
            <p className="text-sm text-text-secondary">Nothing here yet.</p>
          )}
          {connections?.map((c) => (
            <div key={c.id} className="rounded-card border border-border bg-surface p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-ai-match">{c.rationale}</span>
                <span className="text-xs font-mono text-text-secondary">{c.status}</span>
              </div>
              <p className="text-sm text-text-primary mb-2">{c.message}</p>
              <a
                href={`/human/${tab === "incoming" ? c.requester_id : c.recipient_id}`}
                className="text-xs font-mono text-text-secondary hover:text-ai-match transition-colors duration-micro"
              >
                view profile →
              </a>

              {tab === "incoming" && c.status === "pending" && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => respond(c.id, "accept")}
                    disabled={busyId === c.id}
                    className="rounded-pill bg-ai-match text-background text-xs font-medium px-4 py-1.5 disabled:opacity-40 transition-opacity duration-micro"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => respond(c.id, "decline")}
                    disabled={busyId === c.id}
                    className="rounded-pill border border-border text-text-secondary text-xs font-medium px-4 py-1.5 hover:text-text-primary transition-colors duration-micro"
                  >
                    Decline
                  </button>
                </div>
              )}

              {c.status === "accepted" && c.conversation_id && (
                <a
                  href={`/conversation/${c.conversation_id}`}
                  className="inline-block mt-3 text-xs font-mono text-ai-match hover:underline"
                >
                  open conversation →
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
