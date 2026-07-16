"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, Inbox, Check, X, MessageCircle } from "lucide-react";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const emptyCopy: Record<Tab, string> = {
    incoming: "No pending requests — when someone reaches out, it'll show up here.",
    outgoing: "You haven't reached out to anyone yet.",
    accepted: "No accepted connections yet.",
  };

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="w-full max-w-lg mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-heading font-bold text-xl tracking-tight">
            SAME<span className="text-ai-match">WORLD</span>
          </h1>
          <a href="/explore" className="link-muted flex items-center gap-1.5">
            <Compass size={13} />
            explore
          </a>
        </div>

        <div className="flex gap-1 mb-6 border-b border-border">
          {(["incoming", "outgoing", "accepted"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`tab-item ${
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
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="skeleton h-28 w-full" />
              ))}
            </div>
          )}
          {connections?.length === 0 && (
            <div className="card-base p-8 text-center flex flex-col items-center gap-2">
              <Inbox size={24} className="text-text-secondary" />
              <p className="text-sm text-text-secondary">{emptyCopy[tab]}</p>
            </div>
          )}
          {connections?.map((c) => (
            <div key={c.id} className="card-base p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-ai-match">{c.rationale}</span>
                <span className="text-xs font-mono text-text-secondary capitalize">{c.status}</span>
              </div>
              <p className="text-sm text-text-primary mb-2">{c.message}</p>
              <a
                href={`/human/${tab === "incoming" ? c.requester_id : c.recipient_id}`}
                className="link-muted hover:!text-ai-match"
              >
                view profile →
              </a>

              {tab === "incoming" && c.status === "pending" && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => respond(c.id, "accept")}
                    disabled={busyId === c.id}
                    className="btn-primary px-4 py-1.5 text-xs flex items-center gap-1"
                  >
                    <Check size={13} />
                    Accept
                  </button>
                  <button
                    onClick={() => respond(c.id, "decline")}
                    disabled={busyId === c.id}
                    className="btn-secondary px-4 py-1.5 text-xs flex items-center gap-1"
                  >
                    <X size={13} />
                    Decline
                  </button>
                </div>
              )}

              {c.status === "accepted" && c.conversation_id && (
                <a
                  href={`/conversation/${c.conversation_id}`}
                  className="link-muted hover:!text-ai-match inline-flex items-center gap-1 mt-3"
                >
                  <MessageCircle size={13} />
                  open conversation
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
