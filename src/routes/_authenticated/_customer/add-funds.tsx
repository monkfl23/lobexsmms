import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { requestPayment } from "@/lib/customer.functions";
import { useI18n } from "@/lib/i18n";
import { DataTable, Field, PageHeader, Panel, StatusBadge, money, td, fdate } from "@/components/lobex/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/_customer/add-funds")({
  head: () => ({ meta: [{ title: "Add Funds — LOBEX SMM" }] }),
  component: AddFunds,
});

function AddFunds() {
  const { t } = useI18n();
  const { user } = Route.useRouteContext();
  const submit = useServerFn(requestPayment);
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from("payments").select("*").eq("user_id", user.id).order("id", { ascending: false }),
        supabase.from("settings").select("key, value").in("key", ["payment_instructions", "payment_methods", "min_deposit"]),
      ]);
      const st: any = Object.fromEntries((s ?? []).map((r) => [r.key, r.value]));
      return { payments: p ?? [], settings: st };
    },
  });
  const methods = (data?.settings.payment_methods || "Bank Transfer, USDT (TRC20), Binance Pay").split(",").map((m: string) => m.trim()).filter(Boolean);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await submit({ data: { amount: Number(amount), method: method || methods[0], reference } });
      toast.success("Payment submitted. It will be credited once verified.");
      setAmount("");
      setReference("");
      qc.invalidateQueries({ queryKey: ["payments"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title={t("addFunds")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel glow>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Method">
              <select className="field" value={method || methods[0]} onChange={(e) => setMethod(e.target.value)}>
                {methods.map((m: string) => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label={t("amount")} hint={`Minimum: ${money(data?.settings.min_deposit ?? 1, 2)}`}>
              <input className="field" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </Field>
            <Field label="Transaction reference"><input className="field" value={reference} onChange={(e) => setReference(e.target.value)} required maxLength={200} /></Field>
            <Button type="submit" className="w-full" disabled={busy}>{t("submit")}</Button>
          </form>
        </Panel>
        <Panel>
          <h2 className="mb-2 font-semibold">Instructions</h2>
          <p className="whitespace-pre-line text-sm text-muted-foreground">{data?.settings.payment_instructions}</p>
        </Panel>
      </div>
      <h2 className="mb-3 mt-8 text-lg font-semibold">{t("payments")}</h2>
      <DataTable head={["ID", t("date"), "Method", "Reference", t("amount"), t("status")]} empty={!data?.payments.length}>
        {data?.payments.map((p) => (
          <tr key={p.id}>
            <td className={td + " font-mono"}>#{p.id}</td>
            <td className={td + " text-muted-foreground"}>{fdate(p.created_at)}</td>
            <td className={td}>{p.method}</td>
            <td className={td + " max-w-[200px] truncate"}>{p.reference}</td>
            <td className={td}>{money(p.amount, 2)}</td>
            <td className={td}><StatusBadge status={p.status} /></td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
