import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { listServices, createOrder } from "@/lib/customer.functions";
import { useI18n } from "@/lib/i18n";
import { Field, PageHeader, Panel, money } from "@/components/lobex/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/_customer/new-order")({
  validateSearch: (s) => z.object({ service: z.coerce.number().optional() }).parse(s),
  head: () => ({ meta: [{ title: "New Order — LOBEX SMM" }] }),
  component: NewOrder,
});

function NewOrder() {
  const { t } = useI18n();
  const search = Route.useSearch();
  const fetchServices = useServerFn(listServices);
  const submitOrder = useServerFn(createOrder);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["catalog"], queryFn: () => fetchServices() });
  const [cat, setCat] = useState<number | null>(null);
  const [svcId, setSvcId] = useState<number | null>(null);
  const [link, setLink] = useState("");
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    const pre = search.service ? data.services.find((s) => s.id === search.service) : null;
    if (pre) {
      setCat(pre.category_id);
      setSvcId(pre.id);
    } else if (cat === null && data.categories.length) {
      setCat(data.categories[0]!.id);
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => data?.services.filter((s) => s.category_id === cat) ?? [], [data, cat]);
  useEffect(() => {
    if (list.length && !list.find((s) => s.id === svcId)) setSvcId(list[0]!.id);
  }, [list]); // eslint-disable-line react-hooks/exhaustive-deps
  const svc = list.find((s) => s.id === svcId);
  const q = parseInt(qty, 10) || 0;
  const total = svc ? (svc.rate * q) / 1000 : 0;

  async function place(e: React.FormEvent) {
    e.preventDefault();
    if (!svc) return;
    if (q < svc.min_qty || q > svc.max_qty) { toast.error(`Quantity must be between ${svc.min_qty} and ${svc.max_qty}`); return; }
    setBusy(true);
    try {
      const r = await submitOrder({ data: { serviceId: svc.id, link: link.trim(), quantity: q } });
      toast.success(`Order #${r.orderId} placed successfully`);
      qc.invalidateQueries();
      navigate({ to: "/orders" });
    } catch (err: any) {
      toast.error(err.message);
      qc.invalidateQueries({ queryKey: ["me"] });
    } finally {
      setBusy(false);
    }
  }

  if (!isLoading && !data?.services.length)
    return (
      <>
        <PageHeader title={t("newOrder")} />
        <Panel>No services are available right now. Please check back shortly or open a support ticket.</Panel>
      </>
    );

  return (
    <>
      <PageHeader title={t("newOrder")} />
      <div className="grid gap-6 lg:grid-cols-5">
        <Panel glow className="lg:col-span-3">
          <form onSubmit={place} className="space-y-5">
            <Field label={t("category")}>
              <select className="field" value={cat ?? ""} onChange={(e) => setCat(Number(e.target.value))}>
                {data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label={t("service")}>
              <select className="field" value={svcId ?? ""} onChange={(e) => setSvcId(Number(e.target.value))}>
                {list.map((s) => <option key={s.id} value={s.id}>{s.id} — {s.name} — {money(s.rate)}</option>)}
              </select>
            </Field>
            <Field label={t("link")}><input className="field" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} required /></Field>
            <Field label={t("quantity")} hint={svc ? `${t("minmax")}: ${svc.min_qty.toLocaleString()} / ${svc.max_qty.toLocaleString()}` : undefined}>
              <input className="field" type="number" min={svc?.min_qty} max={svc?.max_qty} value={qty} onChange={(e) => setQty(e.target.value)} required />
            </Field>
            <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-accent/40 px-4 py-3">
              <span className="text-sm text-muted-foreground">{t("total")}</span>
              <span className="font-display text-2xl font-bold text-primary text-glow">{money(total)}</span>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={busy || !svc}>{busy ? "..." : t("placeOrder")}</Button>
          </form>
        </Panel>
        <Panel className="lg:col-span-2 space-y-4">
          <h2 className="font-semibold">{t("description")}</h2>
          {svc ? (
            <>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Info k={t("serviceId")} v={<span className="font-mono text-primary">{svc.id}</span>} />
                <Info k={t("rate")} v={money(svc.rate)} />
                <Info k="Min" v={svc.min_qty.toLocaleString()} />
                <Info k="Max" v={svc.max_qty.toLocaleString()} />
              </dl>
              <div className="flex flex-wrap gap-2 text-xs">
                {svc.refill ? <Tag icon={<RefreshCw className="h-3 w-3" />} label="Refill" /> : <Tag icon={<XCircle className="h-3 w-3" />} label="No refill" muted />}
                {svc.cancel && <Tag icon={<ShieldCheck className="h-3 w-3" />} label="Cancel" />}
              </div>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{svc.description || svc.name}</p>
            </>
          ) : <p className="text-sm text-muted-foreground">Select a service.</p>}
        </Panel>
      </div>
    </>
  );
}

const Info = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="rounded-lg bg-surface-2 p-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-1 font-semibold">{v}</dd></div>
);
const Tag = ({ icon, label, muted }: { icon: React.ReactNode; label: string; muted?: boolean }) => (
  <span className={"inline-flex items-center gap-1 rounded-full px-2.5 py-1 " + (muted ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground")}>{icon}{label}</span>
);
