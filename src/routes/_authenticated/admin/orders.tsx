import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { adminOrders, adminSyncOrders, adminOrderAction } from "@/lib/admin.functions";
import { useAdminAction, useAdminQuery } from "@/components/lobex/useAdmin";
import { DataTable, PageHeader, StatusBadge, money, td, fdate } from "@/components/lobex/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({ meta: [{ title: "Orders — LOBEX SMM Admin" }] }),
  component: OrdersAdmin,
});

const statuses = ["", "pending", "processing", "in_progress", "completed", "partial", "canceled", "failed"];

function OrdersAdmin() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const { data } = useAdminQuery<any[]>(["orders", status, search], adminOrders, { status: status || undefined, search: search || undefined });
  const sync = useAdminAction(adminSyncOrders);
  const act = useAdminAction(adminOrderAction);
  const [syncing, setSyncing] = useState(false);

  return (
    <>
      <PageHeader
        title="Orders"
        actions={<>
          <input className="field w-40" placeholder="Order ID" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="field w-40" value={status} onChange={(e) => setStatus(e.target.value)}>{statuses.map((s) => <option key={s} value={s}>{s || "All statuses"}</option>)}</select>
          <Button variant="outline" disabled={syncing} onClick={async () => { setSyncing(true); try { const r = await sync({}, ""); toast.success(`${r.updated} order(s) synced`); } catch {} finally { setSyncing(false); } }}>
            <RefreshCw className={"h-4 w-4 " + (syncing ? "animate-spin" : "")} /> Sync statuses
          </Button>
        </>}
      />
      <DataTable head={["ID", "User", "Service", "Link", "Qty", "Charge", "Cost", "Prov. order", "Status", "Date", ""]} empty={!data?.length}>
        {data?.map((o) => (
          <tr key={o.id}>
            <td className={td + " font-mono text-primary"}>#{o.id}</td>
            <td className={td + " text-xs"}>{o.email}</td>
            <td className={td + " max-w-[200px] truncate"}>{o.service_name}</td>
            <td className={td + " max-w-[160px] truncate text-xs"}><a href={o.link} target="_blank" rel="noreferrer" className="hover:text-primary">{o.link}</a></td>
            <td className={td}>{o.quantity}</td>
            <td className={td}>{money(o.charge)}</td>
            <td className={td + " text-muted-foreground"}>{money(o.provider_cost)}</td>
            <td className={td + " font-mono text-xs"}>{o.provider_order_id ?? "-"}</td>
            <td className={td}>
              <StatusBadge status={o.status} />
              {o.refunded && <div className="text-[11px] text-muted-foreground">refunded</div>}
              {o.error && <div className="max-w-[160px] truncate text-[11px] text-destructive" title={o.error}>{o.error}</div>}
            </td>
            <td className={td + " whitespace-nowrap text-xs text-muted-foreground"}>{fdate(o.created_at)}</td>
            <td className={td + " whitespace-nowrap"}>
              <select className="field py-1 text-xs" value="" onChange={(e) => {
                const a = e.target.value;
                if (a && confirm(`${a} order #${o.id}?`)) act({ orderId: o.id, action: a }, "Done").catch(() => {});
              }}>
                <option value="">Actions</option>
                <option value="refill">Refill</option>
                <option value="cancel">Cancel at provider</option>
                {!o.refunded && <option value="refund">Refund to user</option>}
                <option value="mark_completed">Mark completed</option>
              </select>
            </td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
