"use client";

import { useState } from "react";
import {
  HelpCircle,
  X,
  Search,
  Globe2,
  MapPinned,
  Sparkles,
  Radio,
  Zap,
  MessageCircle,
  UserCircle,
} from "lucide-react";

const EXAMPLES = [
  "need a product designer for a fintech app",
  "anyone free to talk about visas right now",
];

const FEATURES = [
  { icon: Search, name: "Search", blurb: "Type what you need in plain language — AI matches you to real people, not keywords." },
  { icon: Globe2, name: "The Globe", blurb: "Every active signal shows up live as a pin, anywhere in the world, as it happens." },
  { icon: MapPinned, name: "Browse Nearby", blurb: "See raw signals from any region, unranked — not filtered by relevance." },
  { icon: Sparkles, name: "Ask the World", blurb: "AI reads your top matches and writes one answer, citing exactly who it drew from." },
  { icon: Radio, name: "World Pulse", blurb: "A live AI headline of what's happening across the globe, refreshed every minute." },
  { icon: Zap, name: "Resonance", blurb: "AI finds two strangers whose signals strikingly match and explains why — every 5 min." },
  { icon: MessageCircle, name: "Connect + Chat", blurb: "Reach out to a signal's owner (AI can suggest an opener), then chat once accepted." },
  { icon: UserCircle, name: "My Signals / Card", blurb: "Post what you need or offer, and manage the public profile others see." },
];

export default function HelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="hidden sm:flex fixed bottom-6 right-6 z-40 h-12 w-12 items-center justify-center rounded-full bg-surface border-2 border-[#F5B822] text-[#F5B822] cursor-pointer glow-gold hover:scale-105 active:scale-95 transition-transform duration-micro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B822] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        title="What is SameWorld?"
        aria-label="What is SameWorld?"
      >
        <HelpCircle size={22} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm max-h-[75vh] overflow-y-auto card-base !border-[#F5B822]/40 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-heading font-bold text-text-primary">What is SameWorld?</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="link-muted">
                <X size={13} />
              </button>
            </div>
            <p className="text-sm text-text-primary leading-relaxed mb-4">
              A real-time search engine for <em>human intent</em>. Instead of keywords, you post what you
              need, offer, or are doing right now — AI matches you to real people, not tags.
            </p>
            <p className="text-xs font-mono text-text-secondary mb-2">Features</p>
            <div className="flex flex-col gap-2.5 mb-4">
              {FEATURES.map(({ icon: Icon, name, blurb }) => (
                <div key={name} className="flex items-start gap-2.5">
                  <Icon size={14} className="text-ai-match shrink-0 mt-0.5" />
                  <p className="text-xs text-text-secondary leading-relaxed">
                    <span className="text-text-primary font-semibold">{name}</span> — {blurb}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs font-mono text-text-secondary mb-2">Try it — click a search:</p>
            <div className="flex flex-col gap-1.5">
              {EXAMPLES.map((ex) => (
                <a
                  key={ex}
                  href={`/explore?q=${encodeURIComponent(ex)}`}
                  className="text-xs font-mono text-ai-match bg-ai-match/10 border border-ai-match/25 rounded-pill px-3 py-2 no-underline hover:bg-ai-match/20 hover:border-ai-match/50 transition-colors duration-micro"
                >
                  &ldquo;{ex}&rdquo;
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
