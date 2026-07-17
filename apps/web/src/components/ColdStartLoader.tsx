"use client";

import { useEffect, useState } from "react";

const FACTS = [
  "Matching you to real people, not keywords.",
  "Every post is checked before anyone else sees it.",
  "Searching by meaning, not exact words.",
  "Somewhere right now, someone's looking for exactly what you need.",
  "No feeds, no scrolling — just people.",
  "Waking the world up for you.",
];

export default function ColdStartLoader() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % FACTS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-10">
      <div className="relative h-14 w-14 shrink-0">
        <div className="absolute inset-0 rounded-full bg-ai-match/25 animate-orb-pulse" />
        <div className="absolute inset-[10px] rounded-full bg-ai-match" />
      </div>
      <p
        key={index}
        className="text-sm text-text-secondary text-center max-w-[15rem] leading-relaxed animate-ticker-fade"
      >
        {FACTS[index]}
      </p>
    </div>
  );
}
