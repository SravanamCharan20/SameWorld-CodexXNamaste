"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle2, Compass, ShieldAlert, CheckCircle2, Save } from "lucide-react";
import { apiFetch, personaHeaders } from "@/lib/api";
import { getStoredPersona, Persona } from "@/lib/persona";
import { ContactIntent, ProfileUpsertResponse, Signal, Visibility } from "@/lib/types";

export default function ProfileEditPage() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const [bio, setBio] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [linksInput, setLinksInput] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("worldwide");
  const [contactIntent, setContactIntent] = useState<ContactIntent>("open_to_conversation");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = getStoredPersona();
    if (!stored) {
      router.push("/login");
      return;
    }
    setPersona(stored);
    apiFetch<Signal>(`/profile/${stored.id}`).then((res) => {
      if (res.data) {
        setBio(res.data.raw_text);
        setTagsInput(res.data.tags.join(", "));
        setLinksInput(res.data.links.join("\n"));
        setVisibility(res.data.visibility);
        setContactIntent(res.data.contact_intent);
      }
      setLoading(false);
    });
  }, [router]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!persona || !bio.trim()) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const links = linksInput.split("\n").map((l) => l.trim()).filter(Boolean);
    const res = await apiFetch<ProfileUpsertResponse>("/profile", {
      method: "POST",
      headers: personaHeaders(persona.id),
      body: JSON.stringify({ bio, tags, links, visibility, contact_intent: contactIntent }),
    });
    if (res.data && "blocked" in res.data && res.data.blocked) {
      setError(res.data.reason);
    } else if (res.data) {
      setSaved(true);
    } else {
      setError(res.error ?? "Could not save profile");
    }
    setSaving(false);
  }

  if (!persona || loading) {
    return (
      <main className="min-h-screen px-4 py-12">
        <div className="w-full max-w-lg mx-auto space-y-4">
          <div className="skeleton h-8 w-40" />
          <div className="skeleton h-64 w-full" />
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
          <div className="flex items-center gap-4">
            <a href={`/human/${persona.id}`} className="link-muted flex items-center gap-1.5">
              <UserCircle2 size={13} />
              view my card
            </a>
            <a href="/explore" className="link-muted flex items-center gap-1.5">
              <Compass size={13} />
              explore
            </a>
          </div>
        </div>

        <h2 className="text-sm text-text-secondary mb-3">
          {bio ? "Edit your profile" : "Create your profile"}
        </h2>
        <p className="text-xs text-text-secondary mb-4">
          A profile is a permanent signal — it never expires and shows up in search
          exactly like any other signal, pinned above your live posts on your Human
          Card.
        </p>

        <form onSubmit={save} className="card-base p-4 space-y-4">
          <div>
            <label className="text-xs font-mono text-text-secondary block mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Who are you, what do you do, what are you open to?"
              rows={4}
              className="input-base w-full resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-text-secondary block mb-1">
              Tags (comma separated)
            </label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="product design, fintech, climate tech"
              className="input-base w-full"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-text-secondary block mb-1">
              Links (one per line, plain URLs)
            </label>
            <textarea
              value={linksInput}
              onChange={(e) => setLinksInput(e.target.value)}
              placeholder="https://yoursite.com"
              rows={2}
              className="input-base w-full font-mono text-xs resize-none"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-mono text-text-secondary block mb-1">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as Visibility)}
                className="input-base w-full font-mono text-xs py-2"
              >
                <option value="worldwide">Worldwide</option>
                <option value="country">Country</option>
                <option value="region">Region</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-mono text-text-secondary block mb-1">
                Contact
              </label>
              <select
                value={contactIntent}
                onChange={(e) => setContactIntent(e.target.value as ContactIntent)}
                className="input-base w-full font-mono text-xs py-2"
              >
                <option value="just_sharing">Just sharing</option>
                <option value="open_to_conversation">Open to conversation</option>
                <option value="actively_looking">Actively looking</option>
              </select>
            </div>
          </div>

          {error && (
            <div>
              <p className="text-sm text-red-400 flex items-center gap-1.5">
                <ShieldAlert size={14} />
                This didn&apos;t clear the safety gate.
              </p>
              <p className="text-xs text-text-secondary font-mono mt-1">{error}</p>
            </div>
          )}
          {saved && (
            <p className="text-xs text-now font-mono flex items-center gap-1.5">
              <CheckCircle2 size={13} />
              Profile saved.
            </p>
          )}

          <button type="submit" disabled={saving || !bio.trim()} className="btn-primary flex items-center gap-1.5">
            <Save size={14} />
            {saving ? "Saving…" : "Save Profile"}
          </button>
        </form>
      </div>
    </main>
  );
}
