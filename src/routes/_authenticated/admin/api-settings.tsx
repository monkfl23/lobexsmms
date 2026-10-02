import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel } from "@/components/lobex/ui";
import { SettingsForm } from "@/components/lobex/SettingsForm";

export const Route = createFileRoute("/_authenticated/admin/api-settings")({
  head: () => ({ meta: [{ title: "API Settings — LOBEX SMM Admin" }] }),
  component: ApiSettings,
});

function ApiSettings() {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  return (
    <>
      <PageHeader title="API Settings" sub="Reseller API v2 for your customers." />
      <Panel className="mb-6 max-w-2xl">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Public endpoint</div>
        <div className="mt-1 font-mono text-sm text-primary">{/(lovable\.app|lovableproject\.com|localhost)/.test(origin) || !origin ? "https://lobexsmm.lovable.app" : origin}/v2</div>
        <p className="mt-2 text-sm text-muted-foreground">Supported actions: services, add, status, balance, refill, cancel. Customers find their key on the API page.</p>
      </Panel>
      <SettingsForm fields={[{ key: "api_enabled", label: "Customer API access", type: "toggle" }]} />
    </>
  );
}
