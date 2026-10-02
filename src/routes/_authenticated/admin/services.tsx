import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { adminServices, adminSaveService, adminToggleService, adminDeleteService, adminCategories, adminProviders } from "@/lib/admin.functions";
import { useAdminAction, useAdminQuery } from "@/components/lobex/useAdmin";
import { DataTable, Field, PageHeader, money, td } from "@/components/lobex/ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/services")({
  head: () => ({ meta: [{ title: "Services — LOBEX SMM Admin" }] }),
  component: ServicesAdmin,
});

const blank = {
  name: "", description: "", category_id: null, provider_id: null, provider_service_id: "",
  provider_rate: 0, rate: 0, min_qty: 10, max_qty: 10000, refill: false, cancel: false, enabled: true,
};

function ServicesAdmin() {
  const { data } = useAdminQuery<any[]>(["services"], adminServices);
  const { data: cats } = useAdminQuery<any[]>(["categories"], adminCategories);
  const { data: provs } = useAdminQuery<any[]>(["providers"], adminProviders);
  const save = useAdminAction(adminSaveService);
  const toggle = useAdminAction(adminToggleService);
  const del = useAdminAction(adminDeleteService);
  const [form, setForm] = useState<any>(null);
  const [q, setQ] = useState("");
  const [catF, setCatF] = useState("");
  const rows = (data ?? []).filter((s) => (!q || s.name.toLowerCase().includes(q.toLowerCase()) || String(s.id) === q) && (!catF || String(s.category_id) === catF));
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <>
      <PageHeader
        title="Services"
        sub="Each LOBEX SMM service maps to a provider service ID."
        actions={<>
          <select className="field w-44" value={catF} onChange={(e) => setCatF(e.target.value)}><option value="">All categories</option>{cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <input className="field w-48" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button onClick={() => setForm({ ...blank })}><Plus className="h-4 w-4" /> Add service</Button>
        </>}
      />
      <DataTable head={["ID", "Name", "Category", "Provider", "Prov. ID", "Prov. rate", "Rate", "Min/Max", "Flags", "On", ""]} empty={!rows.length}>
        {rows.map((s) => (
          <tr key={s.id}>
            <td className={td + " font-mono text-primary"}>{s.id}</td>
            <td className={td + " max-w-[260px] truncate"}>{s.name}</td>
            <td className={td + " text-muted-foreground"}>{cats?.find((c) => c.id === s.category_id)?.name ?? "-"}</td>
            <td className={td}>{provs?.find((p) => p.id === s.provider_id)?.name ?? <span className="text-destructive">None</span>}</td>
            <td className={td + " font-mono"}>{s.provider_service_id ?? "-"}</td>
            <td className={td}>{money(s.provider_rate)}</td>
            <td className={td + " font-semibold"}>{money(s.rate)}</td>
            <td className={td + " whitespace-nowrap text-xs"}>{s.min_qty} / {s.max_qty}</td>
            <td className={td + " text-xs"}>{[s.refill && "Refill", s.cancel && "Cancel"].filter(Boolean).join(", ") || "-"}</td>
            <td className={td}><Switch checked={s.enabled} onCheckedChange={(v) => toggle({ id: s.id, enabled: v }, "")} /></td>
            <td className={td + " whitespace-nowrap"}>
              <Button size="sm" variant="ghost" onClick={() => setForm({ ...s, provider_service_id: s.provider_service_id ?? "" })}>Edit</Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirm(`Delete service ${s.id}?`) && del({ id: s.id }, "Deleted")}>Delete</Button>
            </td>
          </tr>
        ))}
      </DataTable>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form?.id ? `Edit service #${form.id}` : "Add service"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid max-h-[70vh] gap-3 overflow-y-auto sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Service name"><input className="field" value={form.name} onChange={(e) => set("name", e.target.value)} /></Field></div>
              <Field label="Category">
                <select className="field" value={form.category_id ?? ""} onChange={(e) => set("category_id", e.target.value ? Number(e.target.value) : null)}>
                  <option value="">—</option>{cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Provider">
                <select className="field" value={form.provider_id ?? ""} onChange={(e) => set("provider_id", e.target.value || null)}>
                  <option value="">—</option>{provs?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Provider service ID"><input className="field" value={form.provider_service_id} onChange={(e) => set("provider_service_id", e.target.value)} /></Field>
              <Field label="Provider rate (per 1000)"><input className="field" type="number" step="0.0001" value={form.provider_rate} onChange={(e) => set("provider_rate", e.target.value)} /></Field>
              <Field label="Customer rate (per 1000)"><input className="field" type="number" step="0.0001" value={form.rate} onChange={(e) => set("rate", e.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Min"><input className="field" type="number" value={form.min_qty} onChange={(e) => set("min_qty", e.target.value)} /></Field>
                <Field label="Max"><input className="field" type="number" value={form.max_qty} onChange={(e) => set("max_qty", e.target.value)} /></Field>
              </div>
              <div className="sm:col-span-2"><Field label="Description"><textarea className="field min-h-24" value={form.description} onChange={(e) => set("description", e.target.value)} /></Field></div>
              <div className="flex flex-wrap gap-5 text-sm sm:col-span-2">
                <label className="flex items-center gap-2"><Switch checked={form.refill} onCheckedChange={(v) => set("refill", v)} /> Refill</label>
                <label className="flex items-center gap-2"><Switch checked={form.cancel} onCheckedChange={(v) => set("cancel", v)} /> Cancel</label>
                <label className="flex items-center gap-2"><Switch checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} /> Enabled</label>
              </div>
              <Button className="sm:col-span-2" onClick={async () => {
                await save({
                  id: form.id, name: form.name, description: form.description ?? "", category_id: form.category_id, provider_id: form.provider_id,
                  provider_service_id: form.provider_service_id || null, provider_rate: Number(form.provider_rate), rate: Number(form.rate),
                  min_qty: Number(form.min_qty), max_qty: Number(form.max_qty), refill: form.refill, cancel: form.cancel, enabled: form.enabled,
                });
                setForm(null);
              }}>Save service</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
