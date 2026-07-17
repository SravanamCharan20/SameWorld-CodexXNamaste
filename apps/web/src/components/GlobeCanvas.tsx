"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
import type { GlobePoint } from "@/lib/types";

const NOW_COLOR = "#22C55E";
const OPEN_COLOR = "#F5B822";
const AI_MATCH_COLOR = "#818CF8";
const MINE_COLOR = "#A78BFA";
const DIM_COLOR = "#3a3d4a";

// The subsolar point (where the sun is directly overhead right now) — a
// standard low-precision solar-position approximation (accurate to ~1°),
// plenty for a visual effect rather than real navigation.
function getSubsolarPoint(date: Date): { lat: number; lng: number } {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - startOfYear) / 86400000);
  const declination = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const rawLng = (12 - utcHours) * 15;
  const lng = ((rawLng + 180) % 360 + 360) % 360 - 180;
  return { lat: declination, lng };
}

// Ported directly from globe.gl's own reference implementation
// (https://globe.gl/example/day-night-cycle/) — the day/night blend lives in
// the globe's own shader, driven purely by real sun position, rather than
// depending on scene lights the way MeshPhongMaterial + a DirectionalLight
// does. That's what gives a genuinely sharp, accurate terminator instead of
// a soft Lambertian falloff, and it's completely decoupled from every other
// layer in the scene (nothing else needs to compromise for its sake).
const DAY_NIGHT_SHADER = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec2 vUv;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    #define PI 3.141592653589793
    uniform sampler2D dayTexture;
    uniform sampler2D nightTexture;
    uniform vec2 sunPosition;
    uniform vec2 globeRotation;
    varying vec3 vNormal;
    varying vec2 vUv;

    float toRad(in float a) {
      return a * PI / 180.0;
    }

    vec3 Polar2Cartesian(in vec2 c) { // [lng, lat]
      float theta = toRad(90.0 - c.x);
      float phi = toRad(90.0 - c.y);
      return vec3(
        sin(phi) * cos(theta),
        cos(phi),
        sin(phi) * sin(theta)
      );
    }

    void main() {
      float invLon = toRad(globeRotation.x);
      float invLat = -toRad(globeRotation.y);
      mat3 rotX = mat3(
        1, 0, 0,
        0, cos(invLat), -sin(invLat),
        0, sin(invLat), cos(invLat)
      );
      mat3 rotY = mat3(
        cos(invLon), 0, sin(invLon),
        0, 1, 0,
        -sin(invLon), 0, cos(invLon)
      );
      vec3 rotatedSunDirection = rotX * rotY * Polar2Cartesian(sunPosition);
      float intensity = dot(normalize(vNormal), normalize(rotatedSunDirection));
      vec4 dayColor = texture2D(dayTexture, vUv);
      vec4 nightColor = texture2D(nightTexture, vUv);
      float blendFactor = smoothstep(-0.1, 0.1, intensity);
      gl_FragColor = mix(nightColor, dayColor, blendFactor);
    }
  `,
};

// Soft radial-glow sprite texture, generated once via canvas — replaces the
// old solid 3D "pushpin" cylinders. Sprites always face the camera and are
// fully unlit, so signals read as clean glowing beacons against real
// satellite imagery and stay visible on both the day and night side without
// any scene lighting dependency at all.
function createGlowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.85)");
  gradient.addColorStop(0.55, "rgba(255,255,255,0.22)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export type GlobeCanvasProps = {
  points: GlobePoint[];
  highlightedIds: Set<string>;
  dimmed: boolean;
  focusTarget: { lat: number; lng: number } | null;
  origin?: { lat: number; lng: number } | null;
  ownPersonaId?: string;
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

type ObjectDatum =
  | (GlobePoint & { objType: "point"; dimmed: boolean; highlighted: boolean; mine: boolean })
  | (ClusterMarker & { objType: "cluster" });

export default function GlobeCanvas({
  points: rawPoints,
  highlightedIds,
  dimmed,
  focusTarget,
  origin,
  ownPersonaId,
  onPointClick,
  onClusterClick,
}: GlobeCanvasProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [pulseIds, setPulseIds] = useState<string[]>([]);
  const focusTargetRef = useRef(focusTarget);
  focusTargetRef.current = focusTarget;
  const [liveTick, setLiveTick] = useState(0);

  // Clustering is skipped while a search is active — matched results need to
  // stay individually visible (and each one needs its own arc landing on it),
  // so collapsing them into a count marker would hide exactly what the user
  // just searched for.
  const { solo: points, clusters } = useMemo(
    () => (highlightedIds.size > 0 ? { solo: rawPoints, clusters: [] } : clusterPoints(rawPoints, ownPersonaId)),
    [rawPoints, highlightedIds, ownPersonaId]
  );

  const glowTexture = useMemo(() => createGlowTexture(), []);

  const globeMaterial = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: loader.load("/globe-textures/earth-blue-marble.jpg") },
        nightTexture: { value: loader.load("/globe-textures/earth-night.jpg") },
        sunPosition: { value: new THREE.Vector2() },
        globeRotation: { value: new THREE.Vector2() },
      },
      vertexShader: DAY_NIGHT_SHADER.vertexShader,
      fragmentShader: DAY_NIGHT_SHADER.fragmentShader,
    });
  }, []);

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

  // Keeps the shader's sun position accurate to real time, ticking once a
  // minute — plenty, since the sun's apparent position barely moves faster
  // than that.
  useEffect(() => {
    const interval = setInterval(() => setLiveTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const { lat, lng } = getSubsolarPoint(new Date());
    globeMaterial.uniforms.sunPosition.value.set(lng, lat);
  }, [liveTick, globeMaterial]);

  useEffect(() => {
    if (dimmed) return;
    const interval = setInterval(() => {
      if (points.length === 0) return;
      const shuffled = [...points].sort(() => Math.random() - 0.5);
      setPulseIds(shuffled.slice(0, Math.min(6, shuffled.length)).map((p) => p.id));
    }, 3200);
    return () => clearInterval(interval);
  }, [points, dimmed]);

  const objectsLayerData: ObjectDatum[] = useMemo(() => {
    const out: ObjectDatum[] = [];
    for (const p of points) {
      const highlighted = highlightedIds.has(p.id);
      // The permanent profile signal doesn't count as "mine" here — this
      // marker is for the signals you actively post (NOW/OPEN), not the
      // always-on profile, so it actually means something when it shows up.
      const mine = !!ownPersonaId && p.owner_id === ownPersonaId && !p.is_profile;
      const isDimmed = dimmed && !highlighted && !mine;
      out.push({ ...p, objType: "point", dimmed: isDimmed, highlighted, mine });
    }
    for (const c of clusters) {
      out.push({ ...c, objType: "cluster" });
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
  // (unrelated) results themselves.
  const arcsData = useMemo(() => {
    if (highlightedIds.size === 0 || !origin) return [];
    const highlighted = points.filter((p) => highlightedIds.has(p.id));
    return highlighted.map((p) => ({
      startLat: origin.lat,
      startLng: origin.lng,
      endLat: p.lat,
      endLng: p.lng,
    }));
  }, [points, highlightedIds, origin]);

  return (
    <Globe
      ref={globeRef}
      onGlobeReady={() => setReady(true)}
      globeMaterial={globeMaterial}
      backgroundImageUrl="/globe-textures/night-sky.png"
      showAtmosphere
      atmosphereColor={AI_MATCH_COLOR}
      atmosphereAltitude={0.18}
      onZoom={(pov) => {
        // Compensates the shader's sun direction for the current camera
        // orientation every time the view rotates or zooms — straight from
        // globe.gl's own reference implementation.
        globeMaterial.uniforms.globeRotation.value.set(pov.lng, pov.lat);
      }}
      objectsData={objectsLayerData}
      objectLat={(d) => (d as ObjectDatum).lat}
      objectLng={(d) => (d as ObjectDatum).lng}
      objectAltitude={0.012}
      objectFacesSurfaces={false}
      objectThreeObject={(d: object) => {
        // A single Sprite, not a Group — three-globe wraps whatever this
        // returns in its own Group for data-binding/raycasting, so keeping
        // this to one object (matching the library's own default-object
        // convention) is what makes onObjectClick/onObjectHover reliably
        // resolve back to the right datum.
        const datum = d as ObjectDatum;
        let color: string;
        let size: number;
        let opacity = 1;
        if (datum.objType === "cluster") {
          color = datum.mine ? MINE_COLOR : datum.dominant === "NOW" ? NOW_COLOR : OPEN_COLOR;
          size = Math.min(5 + Math.sqrt(datum.count) * 2.6, 13);
        } else {
          color = datum.mine
            ? MINE_COLOR
            : datum.dimmed
            ? DIM_COLOR
            : datum.kind === "NOW"
            ? NOW_COLOR
            : OPEN_COLOR;
          size = datum.mine ? 6.5 : datum.highlighted ? 6 : 4;
          opacity = datum.dimmed ? 0.4 : 1;
        }
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, depthWrite: false, opacity })
        );
        sprite.scale.set(size, size, 1);
        return sprite;
      }}
      objectLabel={(d) => {
        const datum = d as ObjectDatum;
        if (datum.objType === "cluster") {
          return `<div style="font-family: var(--font-mono, monospace); font-size: 11px; background: #17171A; border: 1px solid #26262B; border-radius: 8px; padding: 8px 10px; color: #F2F2F5; max-width: 220px;">
            <div style="color: ${datum.mine ? MINE_COLOR : "#F2F2F5"}; font-weight: 600; margin-bottom: 2px;">${datum.count} signals · ${escapeHtml(datum.region_label)}</div>
            ${onClusterClick ? '<div style="color: #6b6c7a; font-size: 10px;">click to browse this region →</div>' : ""}
          </div>`;
        }
        return `<div style="font-family: var(--font-mono, monospace); font-size: 11px; background: #17171A; border: 1px solid #26262B; border-radius: 8px; padding: 8px 10px; color: #F2F2F5; max-width: 220px;">
          <div style="color: ${datum.mine ? MINE_COLOR : datum.kind === "NOW" ? NOW_COLOR : OPEN_COLOR}; font-weight: 600; margin-bottom: 2px;">${datum.mine ? "YOU · " : ""}${datum.kind} · ${datum.region_label}</div>
          <div style="color: #9A9BAA; margin-bottom: 4px;">${escapeHtml(datum.topic)}</div>
          ${onPointClick ? '<div style="color: #6b6c7a; font-size: 10px;">click to view →</div>' : ""}
        </div>`;
      }}
      onObjectClick={(d, event) => {
        const datum = d as ObjectDatum;
        if (datum.objType === "cluster") {
          onClusterClick?.(datum.region_label, event);
          return;
        }
        onPointClick?.(datum, event);
      }}
      onObjectHover={(d) => {
        // Mutates the Three.js controls object directly (no React state) —
        // rotation pauses only while the pointer is over an actual pin and
        // resumes the instant it leaves, without a setState-during-mount
        // warning thrashing the dynamically-imported globe.
        const datum = d as ObjectDatum | null;
        const isPin = !!datum;
        const isClickable =
          !!datum &&
          ((datum.objType === "point" && !!onPointClick) || (datum.objType === "cluster" && !!onClusterClick));
        const globe = globeRef.current;
        if (globe) {
          globe.controls().autoRotate = !isPin && !focusTargetRef.current;
        }
        const canvas = globe?.renderer()?.domElement;
        if (canvas) canvas.style.cursor = isClickable ? "pointer" : "default";
      }}
      labelsData={clusters}
      labelLat="lat"
      labelLng="lng"
      labelText={(d) => String((d as ClusterMarker).count)}
      labelSize={1.3}
      labelColor={() => "#0e0e10"}
      labelAltitude={0.016}
      labelIncludeDot={false}
      labelResolution={3}
      labelDotOrientation={() => "bottom"}
      ringsData={ringsData}
      ringLat="lat"
      ringLng="lng"
      ringColor={(d: object) => {
        const r = d as { color: string };
        return (t: number) => hexToRgba(r.color, 1 - t);
      }}
      ringMaxRadius={highlightedIds.size > 0 ? 3.2 : 2}
      ringPropagationSpeed={highlightedIds.size > 0 ? 2 : 1}
      ringRepeatPeriod={highlightedIds.size > 0 ? 1200 : 2600}
      arcsData={arcsData}
      arcColor={() => [AI_MATCH_COLOR, "#E0E7FF"]}
      arcAltitude={0.25}
      arcStroke={0.45}
      arcCurveResolution={128}
      arcDashLength={0.15}
      arcDashGap={0.06}
      arcDashAnimateTime={1600}
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
