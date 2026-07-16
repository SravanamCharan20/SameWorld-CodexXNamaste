"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Flag, DoorOpen, Send, CheckCircle2, Sparkles, X } from "lucide-react";
import { apiFetch, personaHeaders } from "@/lib/api";
import { getStoredPersona, Persona } from "@/lib/persona";
import { Conversation } from "@/lib/types";
import Avatar from "@/components/Avatar";

type PersonaInfo = { id: string; display_name: string; region_label: string };

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [otherPersona, setOtherPersona] = useState<PersonaInfo | null>(null);
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

  // Without this, every bubble looked identical apart from left/right
  // alignment — nothing on screen actually named who you were talking to.
  useEffect(() => {
    if (!persona || !conversation) return;
    const otherId = conversation.participant_ids.find((id) => id !== persona.id);
    if (!otherId || otherId === otherPersona?.id) return;
    apiFetch<PersonaInfo>(`/personas/${otherId}`).then((res) => {
      if (res.data) setOtherPersona(res.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona, conversation?.participant_ids]);

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

  if (!persona || !conversation) {
    return (
      <main className="min-h-screen flex justify-center bg-background">
        <div className="w-full max-w-2xl flex flex-col min-h-screen border-x border-border px-4 py-5 gap-4">
          <div className="skeleton h-5 w-24" />
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-12 w-2/3 self-end" />
        </div>
      </main>
    );
  }

  const canResolve = conversation.pinned_context.owner_id === persona.id;
  const isEnded = conversation.status === "ended";
  const otherName = otherPersona?.display_name ?? "…";

  // Consecutive messages from the same sender are grouped tighter (like any
  // real chat app) instead of every bubble getting identical spacing
  // regardless of who sent it — that even spacing is what made the thread
  // read as a wall of disconnected boxes.
  const groups: { senderId: string; messages: typeof conversation.messages }[] = [];
  for (const m of conversation.messages) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.senderId === m.sender_id) lastGroup.messages.push(m);
    else groups.push({ senderId: m.sender_id, messages: [m] });
  }

  return (
    <main className="min-h-screen flex justify-center bg-background">
      <div className="w-full max-w-2xl flex flex-col min-h-screen border-x border-border">
        <div className="border-b border-border shrink-0">
          <div className="px-4 pt-4 flex items-center justify-between">
            <a href="/connections" className="nav-pill">
              <ArrowLeft size={13} />
              connections
            </a>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowReport(true)} className="btn-chip hover:!text-red-400 hover:!border-red-400/70">
                <Flag size={13} />
                report
              </button>
              {!isEnded && (
                <button onClick={endConversation} className="btn-chip hover:!text-red-400 hover:!border-red-400/70">
                  <DoorOpen size={13} />
                  end conversation
                </button>
              )}
            </div>
          </div>
          {/* The contact header — who you're actually talking to, front and
              center, the way any chat app anchors a thread to a person. */}
          <a
            href={otherPersona ? `/human/${otherPersona.id}` : undefined}
            className="flex items-center gap-2.5 px-4 py-3 no-underline hover:bg-white/[0.03] transition-colors duration-micro"
          >
            <Avatar name={otherName} size={32} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{otherName}</p>
              {otherPersona && (
                <p className="text-xs text-text-secondary font-mono">{otherPersona.region_label}</p>
              )}
            </div>
          </a>
        </div>

        <div
          className={`mx-4 mt-4 card-base p-4 transition-opacity duration-panel shrink-0 ${
            resolved ? "opacity-40 !border-resolved" : "!border-ai-match/40"
          }`}
        >
          <span className="text-xs font-mono text-ai-match flex items-center gap-1">
            {conversation.pinned_context.is_profile ? <Sparkles size={11} /> : null}
            {conversation.pinned_context.is_profile ? "PROFILE" : "SIGNAL"} ·{" "}
            {conversation.pinned_context.rationale}
          </span>
          <p className="text-sm text-text-primary mt-1">{conversation.pinned_context.raw_text}</p>
        </div>

        {showReport && (
          <div className="mx-4 mt-3 card-base !border-red-400/40 p-4 shrink-0">
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="What's wrong? (optional)"
              rows={2}
              autoFocus
              className="w-full bg-background border border-border rounded-card px-3 py-2 text-xs text-text-primary resize-none focus:outline-none focus:ring-1 focus:ring-red-400"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={submitReport} className="btn-danger px-4 py-1.5 text-xs">
                Submit report
              </button>
              <button onClick={() => setShowReport(false)} className="btn-secondary px-4 py-1.5 text-xs flex items-center gap-1">
                <X size={12} />
                Cancel
              </button>
            </div>
          </div>
        )}
        {reported && (
          <p className="mx-4 mt-2 text-xs text-text-secondary font-mono flex items-center gap-1 shrink-0">
            <CheckCircle2 size={12} />
            Report submitted. Thank you.
          </p>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {groups.map((group, gi) => {
            const mine = group.senderId === persona.id;
            return (
              <div key={gi} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}>
                <Avatar name={mine ? "You" : otherName} size={26} mine={mine} />
                <div className={`flex flex-col gap-1 max-w-[70%] ${mine ? "items-end" : "items-start"}`}>
                  <span className="text-[11px] font-mono text-text-secondary px-1">
                    {mine ? "You" : otherName}
                  </span>
                  {group.messages.map((m, i) => (
                    <div
                      key={i}
                      className={`rounded-card px-3.5 py-2.5 text-sm leading-relaxed ${
                        mine
                          ? "bg-ai-match text-background rounded-br-sm"
                          : "bg-surface border border-border text-text-primary rounded-bl-sm"
                      }`}
                    >
                      {m.text}
                    </div>
                  ))}
                  {group.messages[group.messages.length - 1].sent_at && (
                    <span className="text-[10px] font-mono text-text-secondary px-1">
                      {new Date(group.messages[group.messages.length - 1].sent_at as string).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
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

        <div className="px-4 py-4 border-t border-border shrink-0">
          {resolved ? (
            <p className="text-sm text-now font-mono text-center flex items-center justify-center gap-1.5">
              <CheckCircle2 size={15} />
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
                  placeholder={`Message ${otherName}…`}
                  className="input-base flex-1 rounded-pill"
                />
                <button type="submit" disabled={sending || !text.trim()} className="btn-primary px-5 flex items-center gap-1.5">
                  <Send size={14} />
                  Send
                </button>
              </form>
              {canResolve && (
                <button
                  onClick={resolve}
                  disabled={resolving}
                  className="w-full rounded-pill bg-now/15 border border-now/50 text-now text-sm font-semibold py-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.3)] transition-all duration-micro hover:bg-now/25 hover:border-now hover:-translate-y-px active:translate-y-0 disabled:opacity-40 flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-now focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <CheckCircle2 size={14} />
                  {resolving ? "…" : "I found what I needed"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
