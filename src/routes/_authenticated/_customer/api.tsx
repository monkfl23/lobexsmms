import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, KeyRound, Link2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { regenerateApiKey } from "@/lib/customer.functions";
import { PageHeader, Panel } from "@/components/lobex/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/_customer/api")({
  head: () => ({ meta: [{ title: "API — LOBEX SMM" }] }),
  component: ApiPage,
});

const docs: { action: string; params: string; response: string }[] = [
  { action: "services", params: "key, action=services", response: `[{"service":1,"name":"Instagram Followers","type":"Default","category":"Instagram","rate":"0.7500","min":"10","max":"10000","refill":true,"cancel":false}]` },
  { action: "add", params: "key, action=add, service, link, quantity", response: `{"order":10001}` },
  { action: "status", params: "key, action=status, order  |  orders=1,2,3", response: `{"charge":"0.7500","start_count":"120","status":"In progress","remains":"400","currency":"USD"}` },
  { action: "balance", params: "key, action=balance", response: `{"balance":"100.0000","currency":"USD"}` },
  { action: "refill", params: "key, action=refill, order", response: `{"refill":10001}` },
  { action: "cancel", params: "key, action=cancel, orders", response: `[{"order":10001,"cancel":1}]` },
];

function ApiPage() {
  const { user } = Route.useRouteContext();
  const regen = useServerFn(regenerateApiKey);
  const qc = useQueryClient();
  const [origin, setOrigin] = useState("");
  const [show, setShow] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const { data } = useQuery({
    queryKey: ["apikey"],
    queryFn: async () => (await supabase.from("api_keys").select("key").eq("user_id", user.id).maybeSingle()).data?.key ?? "",
  });
  const isCustom = !!origin && !/(lovable\.app|lovableproject\.com|localhost)/.test(origin);
  const url = `${isCustom ? origin : "https://lobexsmm.lovable.app"}/v2`;
  const key = data ?? "";
  const shown = key ? (show ? key : key.slice(0, 8) + "•".repeat(20) + key.slice(-4)) : "";
  const copy = (s: string) => navigator.clipboard.writeText(s).then(() => toast.success("Copied"));

  return (
    <>
      <PageHeader title="API" sub="Standard SMM API v2 — HTTP POST, form or JSON body." />
      <div className="grid gap-4 md:grid-cols-2">
        <Panel glow>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><Link2 className="h-3.5 w-3.5 text-primary" /> API URL</div>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5 font-mono text-sm">
            <span className="truncate text-primary">{url}</span>
            <button className="ms-auto shrink-0" aria-label="Copy URL" onClick={() => copy(url)}><Copy className="h-4 w-4 text-primary" /></button>
          </div>
        </Panel>
        <Panel glow>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><KeyRound className="h-3.5 w-3.5 text-primary" /> Your API key</div>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5 font-mono text-sm">
            <span className="truncate">
              {key.startsWith("lbx_") ? <><span className="font-bold text-primary">lbx_</span>{shown.slice(4)}</> : shown}
            </span>
            <button className="ms-auto shrink-0" aria-label="Toggle key" onClick={() => setShow((v) => !v)}>
              {show ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </button>
            <button className="shrink-0" aria-label="Copy key" onClick={() => copy(key)}><Copy className="h-4 w-4 text-primary" /></button>
          </div>
          <Button size="sm" variant="outline" className="mt-3" onClick={async () => { await regen(); qc.invalidateQueries({ queryKey: ["apikey"] }); toast.success("New key generated"); }}>
            <RefreshCw className="h-3.5 w-3.5" /> Regenerate
          </Button>
        </Panel>
      </div>
      <div className="mt-6 space-y-4">
        {docs.map((d) => (
          <Panel key={d.action}>
            <h3 className="font-mono text-primary">{d.action}</h3>
            <p className="mt-1 text-sm text-muted-foreground">Parameters: <span className="font-mono">{d.params}</span></p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-2 p-3 font-mono text-xs">{d.response}</pre>
          </Panel>
        ))}
      </div>
    </>
  );
}
