"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getStoredPersona } from "@/lib/persona";
import { Signal } from "@/lib/types";
import ConnectButton from "@/components/ConnectButton";

type PersonaInfo = {
  id: string;
  display_name: string;
  region_label: string;
  is_demo: boolean;
};

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

export default function HumanCardPage() {
  const params = useParams<{ personaId: string }>();
  const personaId = params.personaId;
  const [persona, setPersona] = useState<PersonaInfo | null>(null);
  const [profile, setProfile] = useState<Signal | null>(null);
  const [liveSignals, setLiveSignals] = useState<Signal[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const isOwnCard = getStoredPersona()?.id === personaId;

  useEffect(() => {
    async function load() {
      const personaRes = await apiFetch<PersonaInfo>(`/personas/${personaId}`);
      if (!personaRes.data) {
        setNotFound(true);
        return;
      }
      setPersona(personaRes.data);

      const [profileRes, signalsRes] = await Promise.all([
        apiFetch<Signal>(`/profile/${personaId}`),
        apiFetch<Signal[]>(`/signals/browse?owner_id=${personaId}`),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      setLiveSignals(signalsRes.data ?? []);
    }
    load();
  }, [personaId]);

  if (notFound) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <p className="text-sm text-text-secondary">This persona doesn&apos;t exist.</p>
      </main>
    );
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

        <div className="mb-6">
          <h2 className="text-lg font-heading font-bold text-text-primary">
            {persona.display_name}
          </h2>
          <p className="text-sm text-text-secondary font-mono">
            {persona.region_label}
            {persona.is_demo && " · demo persona"}
          </p>
          {isOwnCard && (
            <a
              href="/profile/edit"
              className="inline-block mt-2 text-xs font-mono text-ai-match hover:underline"
            >
              edit profile →
            </a>
          )}
        </div>

        {profile && (
          <div className="rounded-card border border-ai-match/40 bg-surface p-5 mb-8 relative">
            <span className="absolute top-4 right-4 text-xs font-mono text-ai-match">
              PROFILE
            </span>
            <p className="text-sm text-text-primary mb-3 pr-16">{profile.raw_text}</p>
            {profile.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap mb-3">
                {profile.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs font-mono text-text-secondary bg-background border border-border rounded-pill px-2 py-0.5"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            {profile.links.length > 0 && (
              <div className="space-y-1">
                {profile.links.map((link) => (
                  <a
                    key={link}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs font-mono text-ai-match hover:underline truncate"
                  >
                    {link}
                  </a>
                ))}
              </div>
            )}
            <div className="mt-3">
              <ConnectButton signalId={profile.id} ownerId={profile.owner_id} rationale="interested in your profile" />
            </div>
          </div>
        )}

        {!profile && (
          <div className="rounded-card border border-border bg-surface p-5 mb-8 text-center">
            <p className="text-sm text-text-secondary">
              {isOwnCard
                ? "You haven't created a profile yet."
                : `${persona.display_name} hasn't created a profile yet.`}
            </p>
            {isOwnCard && (
              <a
                href="/profile/edit"
                className="inline-block mt-2 text-xs font-mono text-ai-match hover:underline"
              >
                create one →
              </a>
            )}
          </div>
        )}

        <h3 className="text-sm text-text-secondary mb-3">Live Signals</h3>
        <div className="space-y-2">
          {liveSignals === null && (
            <p className="text-sm text-text-secondary font-mono">Loading…</p>
          )}
          {liveSignals?.length === 0 && (
            <p className="text-sm text-text-secondary">No active signals right now.</p>
          )}
          {liveSignals?.map((s) => (
            <div key={s.id} className="rounded-card border border-border bg-surface p-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    s.kind === "NOW" ? "bg-now" : "bg-open"
                  }`}
                />
                <span className="text-xs font-mono text-text-secondary">
                  {s.kind} · {INTENT_LABELS[s.intent] ?? s.intent}
                </span>
              </div>
              <p className="text-sm text-text-primary mb-2">{s.raw_text}</p>
              <ConnectButton signalId={s.id} ownerId={s.owner_id} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
