import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { syncMyOrders, orderAction } from "@/lib/customer.functions";
import { useI18n } from "@/lib/i18n";
import { DataTable, PageHeader, StatusBadge, money, td, fdate } from "@/components/lobex/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/_customer/orders")({
  head: () => ({ meta: [{ title: "Orders — LOBEX SMM" }] }),
  component: Orders,
});

const filters = ["all", "pending", "in_progress", "completed", "partial", "canceled", "failed"];

function Orders() {
  const { t } = useI18n();
  const { user } = Route.useRouteContext();
  const sync = useServerFn(syncMyOrders);
  const act = useServerFn(orderAction);
  const qc = useQueryClient();
  const [f, setF] = useState("all");
  const [syncing, setSyncing] = useState(false);
  const { data } = useQuery({
    queryKey: ["orders", f],
    queryFn: async () => {
      let q = supabase.from("orders").select("*").eq("user_id", user.id).order("id", { ascending: false }).limit(200);
      if (f !== "all") q = q.eq("status", f);
      return (await q).data ?? [];
    },
  });

  async function refresh() {
    setSyncing(true);
    try {
      const r = await sync();
      toast.success(`${r.updated} order(s) updated`);
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSyncing(false);
    }
  }

  async function doAction(id: number, action: "refill" | "cancel") {
    try {
      await act({ data: { orderId: id, action } });
      toast.success(`${action} requested`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <>
      <PageHeader title={t("orders")} actions={<Button variant="outline" onClick={refresh} disabled={syncing}><RefreshCw className={"h-4 w-4 " + (syncing ? "animate-spin" : "")} /> {t("refresh")}</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((x) => (
          <button key={x} onClick={() => setF(x)} className={"rounded-full px-3 py-1 text-xs capitalize " + (f === x ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground hover:text-foreground")}>
            {x.replace("_", " ")}
          </button>
        ))}
      </div>
      <DataTable head={["ID", t("date"), t("link"), t("amount"), "Start", t("quantity"), t("service"), t("status"), "Remains", ""]} empty={!data?.length}>
        {data?.map((o) => (
          <tr key={o.id}>
            <td className={td + " font-mono text-primary"}>#{o.id}</td>
            <td className={td + " whitespace-nowrap text-muted-foreground"}>{fdate(o.created_at)}</td>
            <td className={td + " max-w-[180px] truncate"}><a href={o.link} target="_blank" rel="noreferrer" className="hover:text-primary">{o.link}</a></td>
            <td className={td}>{money(o.charge)}</td>
            <td className={td}>{o.start_count ?? "-"}</td>
            <td className={td}>{o.quantity.toLocaleString()}</td>
            <td className={td + " max-w-[220px] truncate"}>{o.service_name}</td>
            <td className={td}><StatusBadge status={o.status} />{o.refunded && <span className="ms-1 text-xs text-muted-foreground">refunded</span>}</td>
            <td className={td}>{o.remains ?? "-"}</td>
            <td className={td + " whitespace-nowrap"}>
              {o.status === "completed" && <button className="text-xs text-primary hover:underline" onClick={() => doAction(o.id, "refill")}>Refill</button>}
              {["pending", "in_progress", "processing"].includes(o.status) && <button className="text-xs text-destructive hover:underline" onClick={() => doAction(o.id, "cancel")}>Cancel</button>}
            </td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
