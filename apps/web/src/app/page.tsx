"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type ServiceStatus = {
  service: string;
  status: "connected" | "not_configured" | "error";
  detail?: string;
};

type HealthData = {
  api: string;
  all_services_up: boolean;
  services: ServiceStatus[];
};

const SERVICE_LABELS: Record<string, string> = {
  mongodb: "MongoDB Atlas",
  qdrant: "Qdrant Cloud",
  redis: "Upstash Redis",
  groq: "Groq",
};

const STATUS_STYLES: Record<ServiceStatus["status"], { dot: string; label: string }> = {
  connected: { dot: "bg-now", label: "Connected" },
  not_configured: { dot: "bg-text-secondary/40", label: "Not configured" },
  error: { dot: "bg-red-500", label: "Error" },
};

export default function Home() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [apiUnreachable, setApiUnreachable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await apiFetch<HealthData>("/health");
        if (!cancelled) {
          setHealth(res.data);
          setApiUnreachable(!res.data);
        }
      } catch {
        if (!cancelled) setApiUnreachable(true);
      }
    }

    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="font-heading font-bold text-2xl tracking-tight">
            SAME<span className="text-ai-match">WORLD</span>
          </h1>
          <p className="mt-2 text-sm text-text-secondary font-mono">
            system status — phase 1 skeleton
          </p>
        </div>

        <div className="rounded-card border border-border bg-surface p-6">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <span className="text-sm text-text-secondary">Frontend</span>
            <StatusRow status="connected" label="Running" />
          </div>

          <div className="flex items-center justify-between py-4 border-b border-border">
            <span className="text-sm text-text-secondary">Backend API</span>
            {apiUnreachable ? (
              <StatusRow status="error" label="Unreachable" />
            ) : health ? (
              <StatusRow status="connected" label="Connected" />
            ) : (
              <span className="text-xs font-mono text-text-secondary">checking…</span>
            )}
          </div>

          {health?.services.map((s) => (
            <div
              key={s.service}
              className="flex items-center justify-between py-4 border-b border-border last:border-b-0"
            >
              <span className="text-sm text-text-secondary">
                {SERVICE_LABELS[s.service] ?? s.service}
              </span>
              <StatusRow status={s.status} label={STATUS_STYLES[s.status].label} />
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-text-secondary font-mono">
          {apiUnreachable
            ? "start the backend: uvicorn app.main:app --reload"
            : "polling /health every 4s — updates as .env credentials land"}
        </p>
      </div>
    </main>
  );
}

function StatusRow({ status, label }: { status: ServiceStatus["status"]; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[status].dot}`} />
      <span className="text-sm font-mono text-text-primary">{label}</span>
    </div>
  );
}
