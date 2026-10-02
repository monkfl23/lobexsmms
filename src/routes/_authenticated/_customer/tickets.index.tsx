import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createTicket } from "@/lib/customer.functions";
import { useI18n } from "@/lib/i18n";
import { DataTable, Field, PageHeader, Panel, StatusBadge, td, fdate } from "@/components/lobex/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/_customer/tickets/")({
  head: () => ({ meta: [{ title: "Tickets — LOBEX SMM" }] }),
  component: Tickets,
});

function Tickets() {
  const { t } = useI18n();
  const { user } = Route.useRouteContext();
  const create = useServerFn(createTicket);
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const { data } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => (await supabase.from("tickets").select("*").eq("user_id", user.id).order("updated_at", { ascending: false })).data ?? [],
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await create({ data: { subject, body } });
      navigate({ to: "/tickets/$id", params: { id: String(r.id) } });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title={t("tickets")} />
      <div className="grid gap-6 lg:grid-cols-5">
        <Panel glow className="lg:col-span-2">
          <form onSubmit={submit} className="space-y-4">
            <Field label="Subject"><input className="field" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} required /></Field>
            <Field label="Message"><textarea className="field min-h-32" value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} required /></Field>
            <Button type="submit" className="w-full" disabled={busy}>{t("submit")}</Button>
          </form>
        </Panel>
        <div className="lg:col-span-3">
          <DataTable head={["ID", "Subject", t("status"), "Updated"]} empty={!data?.length}>
            {data?.map((x) => (
              <tr key={x.id}>
                <td className={td + " font-mono"}>#{x.id}</td>
                <td className={td}><Link to="/tickets/$id" params={{ id: String(x.id) }} className="hover:text-primary">{x.subject}</Link></td>
                <td className={td}><StatusBadge status={x.status} /></td>
                <td className={td + " text-muted-foreground"}>{fdate(x.updated_at)}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      </div>
    </>
  );
}
