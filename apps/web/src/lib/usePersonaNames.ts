"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export type PersonaInfo = { id: string; display_name: string; region_label: string };

// Several screens (search results, connections, chat) need to show WHO a
// signal or message belongs to, not just an opaque owner_id — this fetches
// and caches display names for whatever ids are currently on screen, so each
// caller doesn't repeat its own fetch-and-cache bookkeeping.
export function usePersonaNames(ids: (string | undefined | null)[]): Record<string, PersonaInfo> {
  const [cache, setCache] = useState<Record<string, PersonaInfo>>({});
  const uniqueIds = Array.from(new Set(ids.filter((id): id is string => !!id)));
  const key = uniqueIds.slice().sort().join(",");

  useEffect(() => {
    const missing = uniqueIds.filter((id) => !cache[id]);
    if (missing.length === 0) return;
    Promise.all(missing.map((id) => apiFetch<PersonaInfo>(`/personas/${id}`))).then((results) => {
      setCache((prev) => {
        const next = { ...prev };
        for (const res of results) if (res.data) next[res.data.id] = res.data;
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return cache;
}
