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
const DIM_COLOR = "#3a3d4a";

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
  onPointClick?: (point: GlobePoint) => void;
};

type RenderPoint = GlobePoint & { layer: "halo" | "core"; dimmed: boolean; highlighted: boolean };

export default function GlobeCanvas({
  points,
  highlightedIds,
  dimmed,
  focusTarget,
  onPointClick,
}: GlobeCanvasProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [pulseIds, setPulseIds] = useState<string[]>([]);

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
      globeRef.current.controls().autoRotate = false;
      globeRef.current.pointOfView({ ...focusTarget, altitude: 1.6 }, 800);
    } else {
      globeRef.current.controls().autoRotate = true;
    }
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
      const isDimmed = dimmed && !highlighted;
      out.push({ ...p, layer: "halo", dimmed: isDimmed, highlighted });
      out.push({ ...p, layer: "core", dimmed: isDimmed, highlighted });
    }
    return out;
  }, [points, highlightedIds, dimmed]);

  const ringsData = useMemo(() => {
    const source = highlightedIds.size > 0 ? points.filter((p) => highlightedIds.has(p.id)) : points.filter((p) => pulseIds.includes(p.id));
    return source.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      color: p.kind === "NOW" ? NOW_COLOR : OPEN_COLOR,
    }));
  }, [points, pulseIds, highlightedIds]);

  const arcsData = useMemo(() => {
    if (highlightedIds.size < 2) return [];
    const highlighted = points.filter((p) => highlightedIds.has(p.id));
    const arcs = [];
    for (let i = 0; i < highlighted.length - 1; i++) {
      arcs.push({
        startLat: highlighted[i].lat,
        startLng: highlighted[i].lng,
        endLat: highlighted[i + 1].lat,
        endLng: highlighted[i + 1].lng,
      });
    }
    return arcs;
  }, [points, highlightedIds]);

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
        return p.layer === "core" ? (p.highlighted ? 0.02 : 0.012) : 0.004;
      }}
      pointRadius={(d) => {
        const p = d as RenderPoint;
        if (p.layer === "halo") return p.highlighted ? 1.1 : 0.75;
        return p.highlighted ? 0.55 : 0.32;
      }}
      pointColor={(d) => {
        const p = d as RenderPoint;
        const base = p.kind === "NOW" ? NOW_COLOR : OPEN_COLOR;
        if (p.dimmed) return p.layer === "halo" ? "rgba(58,61,74,0.15)" : DIM_COLOR;
        if (p.layer === "halo") {
          return p.highlighted
            ? hexToRgba(AI_MATCH_COLOR, 0.35)
            : hexToRgba(base, 0.18);
        }
        return base;
      }}
      pointLabel={(d) => {
        const p = d as RenderPoint;
        if (p.layer !== "core") return "";
        return `<div style="font-family: var(--font-mono, monospace); font-size: 11px; background: #17171A; border: 1px solid #26262B; border-radius: 8px; padding: 8px 10px; color: #F2F2F5; max-width: 220px;">
          <div style="color: ${p.kind === "NOW" ? NOW_COLOR : OPEN_COLOR}; font-weight: 600; margin-bottom: 2px;">${p.kind} · ${p.region_label}</div>
          <div style="color: #9A9BAA;">${escapeHtml(p.topic)}</div>
        </div>`;
      }}
      onPointClick={(d) => {
        const p = d as RenderPoint;
        if (p.layer === "core" && onPointClick) onPointClick(p);
      }}
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
      arcColor={() => AI_MATCH_COLOR}
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
