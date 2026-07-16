"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Compass, Pencil, Sparkles, ExternalLink, UserX, Radio } from "lucide-react";
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
  const [profileChecked, setProfileChecked] = useState(false);
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
      setProfileChecked(true);
      setLiveSignals(signalsRes.data ?? []);
    }
    load();
  }, [personaId]);

  if (notFound) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 gap-2">
        <UserX size={28} className="text-text-secondary" />
        <p className="text-sm text-text-secondary">This persona doesn&apos;t exist.</p>
      </main>
    );
  }

  if (!persona) {
    return (
      <main className="min-h-screen px-4 py-12">
        <div className="w-full max-w-lg mx-auto space-y-4">
          <div className="skeleton h-8 w-40" />
          <div className="skeleton h-32 w-full" />
          <div className="skeleton h-20 w-full" />
        </div>
      </main>
    );
  }

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

        <div className="mb-6">
          <h2 className="text-lg font-heading font-bold text-text-primary">
            {persona.display_name}
          </h2>
          <p className="text-sm text-text-secondary font-mono">
            {persona.region_label}
            {persona.is_demo && " · demo persona"}
          </p>
          {isOwnCard && (
            <a href="/profile/edit" className="link-muted hover:!text-ai-match inline-flex items-center gap-1 mt-2">
              <Pencil size={12} />
              edit profile
            </a>
          )}
        </div>

        {profile && (
          <div className="card-base border-ai-match/40 p-5 mb-8 relative">
            <span className="absolute top-4 right-4 text-xs font-mono text-ai-match flex items-center gap-1">
              <Sparkles size={11} />
              PROFILE
            </span>
            <p className="text-sm text-text-primary mb-3 pr-20">{profile.raw_text}</p>
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
              <div className="space-y-1 mb-3">
                {profile.links.map((link) => (
                  <a
                    key={link}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-ai-match hover:underline truncate flex items-center gap-1"
                  >
                    <ExternalLink size={11} />
                    {link}
                  </a>
                ))}
              </div>
            )}
            <ConnectButton signalId={profile.id} ownerId={profile.owner_id} rationale="interested in your profile" />
          </div>
        )}

        {!profile && profileChecked && (
          <div className="card-base p-6 mb-8 text-center flex flex-col items-center gap-2">
            <Sparkles size={20} className="text-text-secondary" />
            <p className="text-sm text-text-secondary">
              {isOwnCard
                ? "You haven't created a profile yet."
                : `${persona.display_name} hasn't created a profile yet.`}
            </p>
            {isOwnCard && (
              <a href="/profile/edit" className="link-muted hover:!text-ai-match">
                create one →
              </a>
            )}
          </div>
        )}

        <h3 className="text-sm text-text-secondary mb-3 flex items-center gap-1.5">
          <Radio size={13} />
          Live Signals
        </h3>
        <div className="space-y-2">
          {liveSignals === null && (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="skeleton h-20 w-full" />
              ))}
            </div>
          )}
          {liveSignals?.length === 0 && (
            <p className="text-sm text-text-secondary">No active signals right now.</p>
          )}
          {liveSignals?.map((s) => (
            <div key={s.id} className="card-base p-4">
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
