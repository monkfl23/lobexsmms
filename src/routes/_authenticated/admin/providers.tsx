import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  adminProviders, adminSaveProvider, adminDeleteProvider, adminProviderBalance, adminProviderServices, adminImportServices,
} from "@/lib/admin.functions";
import { useAdminAction, useAdminQuery } from "@/components/lobex/useAdmin";
import { DataTable, Field, PageHeader, money, td, fdate } from "@/components/lobex/ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/providers")({
  head: () => ({ meta: [{ title: "Providers — LOBEX SMM Admin" }] }),
  component: ProvidersPage,
});

const blank = { name: "", api_url: "", api_key: "", currency: "USD", enabled: true };

function ProvidersPage() {
  const { data } = useAdminQuery<any[]>(["providers"], adminProviders);
  const save = useAdminAction(adminSaveProvider);
  const del = useAdminAction(adminDeleteProvider);
  const balance = useAdminAction(adminProviderBalance);
  const fetchSvcs = useAdminAction(adminProviderServices);
  const [form, setForm] = useState<any>(null);
  const [imp, setImp] = useState<{ provider: any; items: any[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function test(p: any, label: string) {
    setBusy(p.id + label);
    try {
      const r = await balance({ id: p.id }, "");
      toast.success(`${label === "test" ? "Connection OK — " : ""}Balance: ${r.balance} ${r.currency ?? p.currency}`);
    } catch {} finally { setBusy(null); }
  }

  async function openImport(p: any) {
    setBusy(p.id + "import");
    try {
      const items = await fetchSvcs({ id: p.id }, "");
      setImp({ provider: p, items });
    } catch {} finally { setBusy(null); }
  }

  return (
    <>
      <PageHeader title="Providers" sub="API keys are stored server-side and never shown to customers." actions={<Button onClick={() => setForm({ ...blank })}><Plus className="h-4 w-4" /> Add provider</Button>} />
      <DataTable head={["Name", "API URL", "Key", "Currency", "Balance", "Enabled", ""]} empty={!data?.length}>
        {data?.map((p) => (
          <tr key={p.id}>
            <td className={td + " font-semibold"}>{p.name}</td>
            <td className={td + " max-w-[220px] truncate font-mono text-xs"}>{p.api_url}</td>
            <td className={td + " font-mono text-xs text-muted-foreground"}>{p.api_key}</td>
            <td className={td}>{p.currency}</td>
            <td className={td}>{p.last_balance != null ? <>{money(p.last_balance, 2)}<div className="text-[11px] text-muted-foreground">{fdate(p.last_checked_at)}</div></> : "-"}</td>
            <td className={td}><Switch checked={p.enabled} onCheckedChange={(v) => save({ id: p.id, name: p.name, api_url: p.api_url, currency: p.currency, enabled: v })} /></td>
            <td className={td + " whitespace-nowrap space-x-1"}>
              <Button size="sm" variant="outline" disabled={busy === p.id + "test"} onClick={() => test(p, "test")}>Test</Button>
              <Button size="sm" variant="outline" disabled={busy === p.id + "bal"} onClick={() => test(p, "bal")}>Balance</Button>
              <Button size="sm" variant="outline" disabled={busy === p.id + "import"} onClick={() => openImport(p)}>Import</Button>
              <Button size="sm" variant="ghost" onClick={() => setForm({ ...p, api_key: "" })}>Edit</Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirm(`Delete ${p.name}?`) && del({ id: p.id }, "Deleted")}>Delete</Button>
            </td>
          </tr>
        ))}
      </DataTable>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form?.id ? "Edit provider" : "Add provider"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <Field label="Provider name"><input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="API URL" hint="e.g. https://provider.com/api/v2"><input className="field" value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} /></Field>
              <Field label="API key" hint={form.id ? "Leave empty to keep the current key" : undefined}><input className="field" type="password" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} /></Field>
              <Field label="Currency"><input className="field" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></Field>
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} /> Enabled</label>
              <Button className="w-full" onClick={async () => {
                const { id, name, api_key, currency, enabled } = form;
                let api_url = String(form.api_url ?? "").trim();
                if (api_url && !/^https?:\/\//i.test(api_url)) api_url = "https://" + api_url;
                try { new URL(api_url); } catch {
                  toast.error("Enter a valid API URL, e.g. https://provider.com/api/v2");
                  return;
                }
                try {
                  await save({ id, name, api_url, api_key: api_key || undefined, currency, enabled });
                  setForm(null);
                } catch {}
              }}>Save</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {imp && <ImportDialog data={imp} onClose={() => setImp(null)} />}
    </>
  );
}

function ImportDialog({ data, onClose }: { data: { provider: any; items: any[] }; onClose: () => void }) {
  const run = useAdminAction(adminImportServices);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [markup, setMarkup] = useState("50");
  const [busy, setBusy] = useState(false);
  const rows = useMemo(
    () => data.items.filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.category.toLowerCase().includes(q.toLowerCase()) || s.service === q),
    [data.items, q],
  );
  const toggle = (id: string) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>Import services — {data.provider.name} ({data.items.length})</DialogTitle></DialogHeader>
        <div className="flex flex-wrap items-end gap-3">
          <input className="field flex-1" placeholder="Filter by name, category or ID" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="w-32"><Field label="Markup %"><input className="field" type="number" value={markup} onChange={(e) => setMarkup(e.target.value)} /></Field></div>
          <Button variant="outline" onClick={() => setSel(new Set(rows.slice(0, 1000).map((r) => r.service)))}>Select visible</Button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {rows.slice(0, 500).map((s) => (
                <tr key={s.service} className="cursor-pointer hover:bg-surface-2" onClick={() => toggle(s.service)}>
                  <td className="px-3 py-2"><input type="checkbox" checked={sel.has(s.service)} readOnly /></td>
                  <td className="px-3 py-2 font-mono text-xs text-primary">{s.service}</td>
                  <td className="px-3 py-2">{s.name}<div className="text-xs text-muted-foreground">{s.category}</div></td>
                  <td className="px-3 py-2 whitespace-nowrap">{money(s.rate)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{s.min}–{s.max}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button disabled={!sel.size || busy} onClick={async () => {
          setBusy(true);
          try {
            const items = data.items.filter((s) => sel.has(s.service)).map(({ type, ...r }) => r);
            const r = await run({ providerId: data.provider.id, markupPercent: Number(markup) || 0, items }, "");
            toast.success(`Imported ${r.imported} services`);
            onClose();
          } catch {} finally { setBusy(false); }
        }}>Import {sel.size} selected</Button>
      </DialogContent>
    </Dialog>
  );
}
