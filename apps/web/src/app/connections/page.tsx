"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Check, X, MessageCircle } from "lucide-react";
import { apiFetch, personaHeaders } from "@/lib/api";
import { getStoredPersona, Persona } from "@/lib/persona";
import { Connection } from "@/lib/types";
import AppHeader from "@/components/AppHeader";
import PageHeading from "@/components/PageHeading";
import Avatar from "@/components/Avatar";

type Tab = "incoming" | "outgoing" | "accepted";
type PersonaInfo = { id: string; display_name: string; region_label: string };

// Which persona is "the other side" of a connection is a property of the
// connection itself (direction), not of which tab you happen to be viewing —
// using the tab for this was a latent bug: on the Accepted tab (which mixes
// both directions), it silently linked incoming connections' "view profile"
// to your own profile instead of theirs.
function otherPersonaId(c: Connection): string {
  return c.direction === "incoming" ? c.requester_id : c.recipient_id;
}

export default function ConnectionsPage() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [tab, setTab] = useState<Tab>("incoming");
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [people, setPeople] = useState<Record<string, PersonaInfo>>({});

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

  // Every card used to show only a rationale string and a message with no
  // indication of WHO — this fetches (and caches) the other participant's
  // name/region for every connection on screen so each card can say plainly
  // who it's with.
  useEffect(() => {
    if (!connections) return;
    const missing = Array.from(new Set(connections.map(otherPersonaId))).filter((id) => !people[id]);
    if (missing.length === 0) return;
    Promise.all(missing.map((id) => apiFetch<PersonaInfo>(`/personas/${id}`))).then((results) => {
      setPeople((prev) => {
        const next = { ...prev };
        for (const res of results) if (res.data) next[res.data.id] = res.data;
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections]);

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
    <main className="min-h-screen">
      <AppHeader persona={persona} active="connections" />
      <div className="w-full max-w-lg mx-auto px-4 py-8">
        <PageHeading title="Connections" subtitle="Requests you've sent, received, and accepted." />
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
          {connections?.map((c) => {
            const hasConversation = c.status === "accepted" && c.conversation_id;
            const otherId = otherPersonaId(c);
            const other = people[otherId];
            const otherName = other?.display_name ?? "…";
            return (
              <div
                key={c.id}
                className={hasConversation ? "card-interactive p-4" : "card-base p-4"}
              >
                <div className="flex items-center justify-between mb-3 gap-2">
                  <a
                    href={`/human/${otherId}`}
                    className="flex items-center gap-2.5 min-w-0 no-underline hover:opacity-80 transition-opacity"
                  >
                    <Avatar name={otherName} size={30} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{otherName}</p>
                      <p className="text-xs font-mono text-ai-match truncate">{c.rationale}</p>
                    </div>
                  </a>
                  <span
                    className={`badge shrink-0 ${
                      c.status === "accepted"
                        ? "bg-now/15 text-now"
                        : c.status === "declined"
                        ? "bg-white/5 text-text-secondary"
                        : "bg-open/15 text-open"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <p className="text-[11px] font-mono text-text-secondary mb-1">
                  {c.direction === "incoming" ? `${otherName} said` : "You said"}
                </p>
                <p className="text-sm text-text-primary mb-3">{c.message}</p>

                {hasConversation ? (
                  <a
                    href={`/conversation/${c.conversation_id}`}
                    className="btn-primary w-full justify-center py-2 text-xs flex items-center gap-1.5"
                  >
                    <MessageCircle size={14} />
                    Open conversation
                  </a>
                ) : (
                  <a href={`/human/${otherId}`} className="link-muted hover:!text-ai-match">
                    view profile →
                  </a>
                )}

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
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
