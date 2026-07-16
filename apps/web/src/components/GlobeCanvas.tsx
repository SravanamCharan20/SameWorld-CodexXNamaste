"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { feature } from "topojson-client";
import landTopology from "world-atlas/land-110m.json";
import type { GlobePoint } from "@/lib/types";

const NOW_COLOR = "#22C55E";
const OPEN_COLOR = "#F5B822";
const AI_MATCH_COLOR = "#818CF8";
const MINE_COLOR = "#A78BFA";
const DIM_COLOR = "#3a3d4a";
const GOLD_COLOR = "#F5B822";

type LandFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const topo = landTopology as any;
const landFeatures = (feature(topo, topo.objects.land) as unknown as { features: LandFeature[] })
  .features;

export type GlobeCanvasProps = {
  points: GlobePoint[];
  highlightedIds: Set<string>;
  dimmed: boolean;
  focusTarget: { lat: number; lng: number } | null;
  origin?: { lat: number; lng: number } | null;
  ownPersonaId?: string;
  resonanceArc?: { startLat: number; startLng: number; endLat: number; endLng: number } | null;
  onPointClick?: (point: GlobePoint, event: MouseEvent) => void;
  onClusterClick?: (regionLabel: string, event: MouseEvent) => void;
};

type ClusterMarker = {
  id: string;
  lat: number;
  lng: number;
  region_label: string;
  count: number;
  dominant: "NOW" | "OPEN";
  mine: boolean;
};

// Signals from the same persona (or region) share one fixed home coordinate,
// so several points can sit at the exact same lat/lng — previously this
// rendered as an overlapping "flower" of jittered dots, which is exactly the
// visual clutter that got flagged. Instead, a shared coordinate collapses
// into a single sized-by-count cluster marker; clicking it opens the (already
// solid) Browse Nearby panel scoped to that region instead of trying to
// cram N tiny dots into a few pixels of globe surface.
function clusterPoints(
  points: GlobePoint[],
  ownPersonaId: string | undefined
): { solo: GlobePoint[]; clusters: ClusterMarker[] } {
  const groups = new Map<string, GlobePoint[]>();
  for (const p of points) {
    const key = `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`;
    const group = groups.get(key);
    if (group) group.push(p);
    else groups.set(key, [p]);
  }
  const solo: GlobePoint[] = [];
  const clusters: ClusterMarker[] = [];
  for (const group of Array.from(groups.values())) {
    if (group.length === 1) {
      solo.push(group[0]);
      continue;
    }
    const lat = group.reduce((sum, p) => sum + p.lat, 0) / group.length;
    const lng = group.reduce((sum, p) => sum + p.lng, 0) / group.length;
    const nowCount = group.filter((p) => p.kind === "NOW").length;
    clusters.push({
      id: `cluster:${group[0].lat.toFixed(3)},${group[0].lng.toFixed(3)}`,
      lat,
      lng,
      region_label: group[0].region_label,
      count: group.length,
      dominant: nowCount > group.length / 2 ? "NOW" : "OPEN",
      mine: !!ownPersonaId && group.some((p) => p.owner_id === ownPersonaId && !p.is_profile),
    });
  }
  return { solo, clusters };
}

type RenderPoint =
  | (GlobePoint & { variant: "halo" | "core"; dimmed: boolean; highlighted: boolean; mine: boolean })
  | (ClusterMarker & { variant: "cluster" });

export default function GlobeCanvas({
  points: rawPoints,
  highlightedIds,
  dimmed,
  focusTarget,
  origin,
  ownPersonaId,
  resonanceArc,
  onPointClick,
  onClusterClick,
}: GlobeCanvasProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [pulseIds, setPulseIds] = useState<string[]>([]);
  const focusTargetRef = useRef(focusTarget);
  focusTargetRef.current = focusTarget;

  // Clustering is skipped while a search is active — matched results need to
  // stay individually visible (and each one needs its own arc landing on it),
  // so collapsing them into a count marker would hide exactly what the user
  // just searched for.
  const { solo: points, clusters } = useMemo(
    () => (highlightedIds.size > 0 ? { solo: rawPoints, clusters: [] } : clusterPoints(rawPoints, ownPersonaId)),
    [rawPoints, highlightedIds, ownPersonaId]
  );

  const globeMaterial = useMemo(
    () => new THREE.MeshPhongMaterial({ color: "#0b0d16", shininess: 6 }),
    []
  );

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !ready) return;
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.enableZoom = true;
    controls.minDistance = 150;
    controls.maxDistance = 500;
    globe.pointOfView({ lat: 12, lng: 35, altitude: 2.3 }, 0);
  }, [ready]);

  useEffect(() => {
    if (!globeRef.current || !ready) return;
    if (focusTarget) {
      globeRef.current.pointOfView({ ...focusTarget, altitude: 1.6 }, 800);
    }
  }, [focusTarget, ready]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !ready) return;
    globe.controls().autoRotate = !focusTarget;
  }, [focusTarget, ready]);

  useEffect(() => {
    if (dimmed) return;
    const interval = setInterval(() => {
      if (points.length === 0) return;
      const shuffled = [...points].sort(() => Math.random() - 0.5);
      setPulseIds(shuffled.slice(0, Math.min(6, shuffled.length)).map((p) => p.id));
    }, 3200);
    return () => clearInterval(interval);
  }, [points, dimmed]);

  const renderPoints: RenderPoint[] = useMemo(() => {
    const out: RenderPoint[] = [];
    for (const p of points) {
      const highlighted = highlightedIds.has(p.id);
      // The permanent profile signal doesn't count as "mine" here — this
      // marker is for the signals you actively post (NOW/OPEN), not the
      // always-on profile, so it actually means something when it shows up.
      const mine = !!ownPersonaId && p.owner_id === ownPersonaId && !p.is_profile;
      const isDimmed = dimmed && !highlighted && !mine;
      out.push({ ...p, variant: "halo", dimmed: isDimmed, highlighted, mine });
      out.push({ ...p, variant: "core", dimmed: isDimmed, highlighted, mine });
    }
    for (const c of clusters) {
      out.push({ ...c, variant: "cluster" });
    }
    return out;
  }, [points, clusters, highlightedIds, dimmed, ownPersonaId]);

  const myPoints = useMemo(
    () => (ownPersonaId ? points.filter((p) => p.owner_id === ownPersonaId && !p.is_profile) : []),
    [points, ownPersonaId]
  );

  const ringsData = useMemo(() => {
    const pulseSource = highlightedIds.size > 0 ? points.filter((p) => highlightedIds.has(p.id)) : points.filter((p) => pulseIds.includes(p.id));
    const rings = pulseSource.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      color: p.kind === "NOW" ? NOW_COLOR : OPEN_COLOR,
    }));
    // Your own signals always carry a slow, distinct violet ring so you can
    // always find yourself on the globe — not just right after posting.
    for (const p of myPoints) {
      if (highlightedIds.has(p.id)) continue;
      rings.push({ lat: p.lat, lng: p.lng, color: MINE_COLOR });
    }
    for (const c of clusters) {
      if (c.mine) rings.push({ lat: c.lat, lng: c.lng, color: MINE_COLOR });
    }
    return rings;
  }, [points, pulseIds, highlightedIds, myPoints, clusters]);

  // Arcs represent your search reaching out across the world: they fan out
  // from your own location to every matched result, not between the
  // (unrelated) results themselves. A resonance arc (gold) is a separate,
  // independent overlay connecting two other people's signals — it can be
  // visible whether or not a search is active.
  const arcsData = useMemo(() => {
    const arcs: { startLat: number; startLng: number; endLat: number; endLng: number; color: string }[] = [];
    if (highlightedIds.size > 0 && origin) {
      const highlighted = points.filter((p) => highlightedIds.has(p.id));
      for (const p of highlighted) {
        arcs.push({
          startLat: origin.lat,
          startLng: origin.lng,
          endLat: p.lat,
          endLng: p.lng,
          color: AI_MATCH_COLOR,
        });
      }
    }
    if (resonanceArc) {
      arcs.push({ ...resonanceArc, color: GOLD_COLOR });
    }
    return arcs;
  }, [points, highlightedIds, origin, resonanceArc]);

  return (
    <Globe
      ref={globeRef}
      onGlobeReady={() => setReady(true)}
      globeMaterial={globeMaterial}
      backgroundColor="rgba(0,0,0,0)"
      showAtmosphere
      atmosphereColor={AI_MATCH_COLOR}
      atmosphereAltitude={0.18}
      polygonsData={landFeatures}
      polygonCapColor={() => "#242840"}
      polygonSideColor={() => "rgba(10,10,20,0.25)"}
      polygonStrokeColor={() => "#4b5170"}
      polygonAltitude={0.008}
      polygonsTransitionDuration={0}
      pointsData={renderPoints}
      pointLat="lat"
      pointLng="lng"
      pointAltitude={(d) => {
        const p = d as RenderPoint;
        if (p.variant === "cluster") return 0.018;
        if (p.variant !== "core") return 0.004;
        if (p.mine) return 0.024;
        return p.highlighted ? 0.02 : 0.012;
      }}
      pointRadius={(d) => {
        const p = d as RenderPoint;
        if (p.variant === "cluster") return Math.min(0.55 + Math.sqrt(p.count) * 0.22, 1.7);
        if (p.variant === "halo") return p.mine ? 1.3 : p.highlighted ? 1.1 : 0.75;
        return p.mine ? 0.62 : p.highlighted ? 0.55 : 0.32;
      }}
      pointColor={(d) => {
        const p = d as RenderPoint;
        if (p.variant === "cluster") {
          if (p.mine) return MINE_COLOR;
          return p.dominant === "NOW" ? NOW_COLOR : OPEN_COLOR;
        }
        const base = p.kind === "NOW" ? NOW_COLOR : OPEN_COLOR;
        if (p.mine) {
          return p.variant === "halo" ? hexToRgba(MINE_COLOR, 0.4) : MINE_COLOR;
        }
        if (p.dimmed) return p.variant === "halo" ? "rgba(58,61,74,0.15)" : DIM_COLOR;
        if (p.variant === "halo") {
          return p.highlighted
            ? hexToRgba(AI_MATCH_COLOR, 0.35)
            : hexToRgba(base, 0.18);
        }
        return base;
      }}
      pointLabel={(d) => {
        const p = d as RenderPoint;
        if (p.variant === "cluster") {
          return `<div style="font-family: var(--font-mono, monospace); font-size: 11px; background: #17171A; border: 1px solid #26262B; border-radius: 8px; padding: 8px 10px; color: #F2F2F5; max-width: 220px;">
            <div style="color: ${p.mine ? MINE_COLOR : "#F2F2F5"}; font-weight: 600; margin-bottom: 2px;">${p.count} signals · ${escapeHtml(p.region_label)}</div>
            ${onClusterClick ? '<div style="color: #6b6c7a; font-size: 10px;">click to browse this region →</div>' : ""}
          </div>`;
        }
        if (p.variant !== "core") return "";
        return `<div style="font-family: var(--font-mono, monospace); font-size: 11px; background: #17171A; border: 1px solid #26262B; border-radius: 8px; padding: 8px 10px; color: #F2F2F5; max-width: 220px;">
          <div style="color: ${p.mine ? MINE_COLOR : p.kind === "NOW" ? NOW_COLOR : OPEN_COLOR}; font-weight: 600; margin-bottom: 2px;">${p.mine ? "YOU · " : ""}${p.kind} · ${p.region_label}</div>
          <div style="color: #9A9BAA; margin-bottom: 4px;">${escapeHtml(p.topic)}</div>
          ${onPointClick ? '<div style="color: #6b6c7a; font-size: 10px;">click to view →</div>' : ""}
        </div>`;
      }}
      onPointClick={(d, event) => {
        const p = d as RenderPoint;
        if (p.variant === "cluster") {
          onClusterClick?.(p.region_label, event);
          return;
        }
        if (p.variant === "core" && onPointClick) onPointClick(p, event);
      }}
      onPointHover={(d) => {
        // Mutates the Three.js controls object directly (no React state) —
        // rotation pauses only while the pointer is over an actual pin and
        // resumes the instant it leaves, without a setState-during-mount
        // warning thrashing the dynamically-imported globe.
        const p = d as RenderPoint | null;
        const isPin = !!p && (p.variant === "core" || p.variant === "cluster");
        const isCore = !!p && p.variant === "core" && !!onPointClick;
        const isCluster = !!p && p.variant === "cluster" && !!onClusterClick;
        const globe = globeRef.current;
        if (globe) {
          globe.controls().autoRotate = !isPin && !focusTargetRef.current;
        }
        const canvas = globe?.renderer()?.domElement;
        if (canvas) canvas.style.cursor = isCore || isCluster ? "pointer" : "default";
      }}
      labelsData={clusters}
      labelLat="lat"
      labelLng="lng"
      labelText={(d) => String((d as ClusterMarker).count)}
      labelSize={1.3}
      labelColor={() => "#0e0e10"}
      labelAltitude={0.021}
      labelIncludeDot={false}
      labelResolution={3}
      labelDotOrientation={() => "bottom"}
      ringsData={ringsData}
      ringLat="lat"
      ringLng="lng"
      ringColor={(d) => {
        const r = d as { color: string };
        return (t: number) => hexToRgba(r.color, 1 - t);
      }}
      ringMaxRadius={highlightedIds.size > 0 ? 3.2 : 2}
      ringPropagationSpeed={highlightedIds.size > 0 ? 2 : 1}
      ringRepeatPeriod={highlightedIds.size > 0 ? 1200 : 2600}
      arcsData={arcsData}
      arcColor={(d) => (d as { color: string }).color}
      arcAltitude={0.25}
      arcStroke={0.4}
      arcDashLength={0.4}
      arcDashGap={0.2}
      arcDashAnimateTime={2000}
      showGraticules={false}
      width={typeof window !== "undefined" ? window.innerWidth : undefined}
      height={typeof window !== "undefined" ? window.innerHeight : undefined}
    />
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const bigint = parseInt(hex.replace("#", ""), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
