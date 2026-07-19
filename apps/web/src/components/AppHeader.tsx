"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, Radio, UserCircle2, Users, LogOut, MapPin, Clock, LucideIcon } from "lucide-react";
import { clearPersona, Persona } from "@/lib/persona";
import HelpButton from "@/components/HelpButton";

// Longitude/15 (even rounded to the nearest half hour) can't reproduce real
// clock time: political time zones don't follow longitude at all — India is
// one single zone (+5:30) centered near 82.5°E, so Gurgaon (77°E, a solar
// offset of +5:09) reads its *clock* time as +5:30, not whatever its meridian
// implies. This is the exact, closed set of region_label values that exist
// in the seed/persona data (verified against the live DB), mapped to their
// real IANA zone so Intl handles the exact offset — and DST — correctly.
const REGION_TIMEZONES: Record<string, string> = {
  "Accra, Ghana": "Africa/Accra",
  "Amsterdam, Netherlands": "Europe/Amsterdam",
  "Austin, USA": "America/Chicago",
  "Bangalore, India": "Asia/Kolkata",
  "Barcelona, Spain": "Europe/Madrid",
  "Berlin, Germany": "Europe/Berlin",
  "Boston, USA": "America/New_York",
  "Bristol, UK": "Europe/London",
  "Bucharest, Romania": "Europe/Bucharest",
  "Buenos Aires, Argentina": "America/Argentina/Buenos_Aires",
  "Busan, South Korea": "Asia/Seoul",
  "Cairo, Egypt": "Africa/Cairo",
  "Cape Town, South Africa": "Africa/Johannesburg",
  "Chennai, India": "Asia/Kolkata",
  "Chicago, USA": "America/Chicago",
  "Copenhagen, Denmark": "Europe/Copenhagen",
  "Denver, USA": "America/Denver",
  "Dubai, UAE": "Asia/Dubai",
  "Dublin, Ireland": "Europe/Dublin",
  "Edinburgh, UK": "Europe/London",
  "Fukuoka, Japan": "Asia/Tokyo",
  "Gurgaon, India": "Asia/Kolkata",
  "Hanoi, Vietnam": "Asia/Ho_Chi_Minh",
  "Ho Chi Minh City, Vietnam": "Asia/Ho_Chi_Minh",
  "Hyderabad, India": "Asia/Kolkata",
  "Jakarta, Indonesia": "Asia/Jakarta",
  "Johannesburg, South Africa": "Africa/Johannesburg",
  "Kochi, India": "Asia/Kolkata",
  "Kolkata, India": "Asia/Kolkata",
  "Krakow, Poland": "Europe/Warsaw",
  "Lagos, Nigeria": "Africa/Lagos",
  "Lisbon, Portugal": "Europe/Lisbon",
  "London, UK": "Europe/London",
  "Los Angeles, USA": "America/Los_Angeles",
  "Madrid, Spain": "Europe/Madrid",
  "Manchester, UK": "Europe/London",
  "Manila, Philippines": "Asia/Manila",
  "Marrakesh, Morocco": "Africa/Casablanca",
  "Melbourne, Australia": "Australia/Melbourne",
  "Mexico City, Mexico": "America/Mexico_City",
  "Mumbai, India": "Asia/Kolkata",
  "Munich, Germany": "Europe/Berlin",
  "Nairobi, Kenya": "Africa/Nairobi",
  "Nashville, USA": "America/Chicago",
  "New Orleans, USA": "America/Chicago",
  "Osaka, Japan": "Asia/Tokyo",
  "Paris, France": "Europe/Paris",
  "Perth, Australia": "Australia/Perth",
  "Portland, USA": "America/Los_Angeles",
  "Porto, Portugal": "Europe/Lisbon",
  "Prague, Czech Republic": "Europe/Prague",
  "Pune, India": "Asia/Kolkata",
  "Reykjavik, Iceland": "Atlantic/Reykjavik",
  "San Francisco, USA": "America/Los_Angeles",
  "San Jose, USA": "America/Los_Angeles",
  "Santiago de Compostela, Spain": "Europe/Madrid",
  "Sao Paulo, Brazil": "America/Sao_Paulo",
  "Seattle, USA": "America/Los_Angeles",
  "Seoul, South Korea": "Asia/Seoul",
  Singapore: "Asia/Singapore",
  "Stockholm, Sweden": "Europe/Stockholm",
  "Tokyo, Japan": "Asia/Tokyo",
  "Toronto, Canada": "America/Toronto",
  "Vancouver, Canada": "America/Vancouver",
  "Vienna, Austria": "Europe/Vienna",
  "Warsaw, Poland": "Europe/Warsaw",
  "Wellington, New Zealand": "Pacific/Auckland",
  "Yerevan, Armenia": "Asia/Yerevan",
  "Zagreb, Croatia": "Europe/Zagreb",
};

// Falls back to the longitude approximation only for a region we don't have
// an explicit zone for — every persona currently in the database is covered
// above, so this path is a safety net, not the common case.
function localTimeLabel(regionLabel: string, lng: number): string {
  const timeZone = REGION_TIMEZONES[regionLabel];
  if (timeZone) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());
  }
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const offsetHours = Math.round((lng / 15) * 2) / 2;
  return new Date(utcMs + offsetHours * 3600000).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

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
  const [localTime, setLocalTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setLocalTime(localTimeLabel(persona.region_label, persona.region_lng));
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [persona.region_label, persona.region_lng]);

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
        {localTime && (
          <span className="hidden sm:inline-flex items-center gap-1 text-xs font-mono text-ai-match bg-ai-match/10 border border-ai-match/25 rounded-pill px-2 py-0.5 whitespace-nowrap">
            <Clock size={11} />
            {localTime}
          </span>
        )}
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
            title="Log out and choose a different profile"
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
