"use client";

import { useRouter } from "next/navigation";
import { Compass, Radio, UserCircle2, Users, LogOut, MapPin, LucideIcon } from "lucide-react";
import { clearPersona, Persona } from "@/lib/persona";
import HelpButton from "@/components/HelpButton";

export type NavKey = "explore" | "signals" | "card" | "connections";

const NAV_ITEMS: { key: NavKey; href: (personaId: string) => string; icon: LucideIcon; label: string }[] = [
  { key: "explore", href: () => "/explore", icon: Compass, label: "explore" },
  { key: "signals", href: () => "/me", icon: Radio, label: "my signals" },
  { key: "card", href: (id) => `/human/${id}`, icon: UserCircle2, label: "my card" },
  { key: "connections", href: () => "/connections", icon: Users, label: "connections" },
];

// Shared across every logged-in screen so the nav is identical everywhere —
// each page used to hand-roll its own header/link set, which is what read as
// "inconsistent" (different nav items, different styling, in different order
// depending which page you landed on).
export default function AppHeader({ persona, active }: { persona: Persona; active?: NavKey }) {
  const router = useRouter();

  function logout() {
    clearPersona();
    router.push("/login");
  }

  return (
    <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-gradient-to-b from-background/90 to-transparent">
      <a href="/explore" className="font-heading font-bold text-lg tracking-tight shrink-0 no-underline">
        SAME<span className="text-ai-match">WORLD</span>
      </a>
      <div className="flex flex-wrap items-center gap-4">
        {/* Plain text, deliberately outside the button row — it used to sit
            inside the same pill surface as the nav buttons and got mistaken
            for a clickable item. It isn't one. */}
        <span className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-text-secondary whitespace-nowrap">
          <MapPin size={12} className="text-text-secondary/70" />
          {persona.display_name} · {persona.region_label}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {NAV_ITEMS.filter((item) => item.key !== active).map(({ key, href, icon: Icon, label }) => (
            <a key={key} href={href(persona.id)} className="nav-pill">
              <Icon size={13} />
              <span className="hidden md:inline">{label}</span>
            </a>
          ))}
          <button
            onClick={logout}
            className="nav-pill"
            title="Log out of this demo persona and pick another one"
          >
            <LogOut size={13} />
            <span className="hidden md:inline">switch persona</span>
          </button>
          <HelpButton />
        </div>
      </div>
    </div>
  );
}
