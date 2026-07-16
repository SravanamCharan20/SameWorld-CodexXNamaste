"use client";

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

const EXAMPLES = [
  "need a product designer for a fintech app",
  "anyone free to talk about visas right now",
];

export default function HelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="nav-pill !px-2.5"
        title="What is SameWorld?"
        aria-label="What is SameWorld?"
      >
        <HelpCircle size={15} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed top-16 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm card-base p-5 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-heading font-bold text-text-primary">What is SameWorld?</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="link-muted">
                <X size={13} />
              </button>
            </div>
            <p className="text-sm text-text-primary leading-relaxed mb-4">
              A real-time search engine for <em>human intent</em>. Instead of keywords, you search for what
              people need, offer, or are doing right now — shown live as pins on the globe, anywhere in the
              world.
            </p>
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
