export type Persona = {
  id: string;
  display_name: string;
  region_label: string;
  region_lat: number;
  region_lng: number;
  profile_signal_id: string | null;
  is_demo: boolean;
};

const STORAGE_KEY = "sameworld_persona";

export function getStoredPersona(): Persona | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Persona) : null;
}

export function storePersona(persona: Persona) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persona));
}

export function clearPersona() {
  localStorage.removeItem(STORAGE_KEY);
}
