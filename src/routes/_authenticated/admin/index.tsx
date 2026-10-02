import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, DollarSign, LifeBuoy, ShoppingBag, TrendingUp, Users, Wallet } from "lucide-react";
import { adminStats } from "@/lib/admin.functions";
import { useAdminQuery } from "@/components/lobex/useAdmin";
import { DataTable, PageHeader, Stat, money, td, fdate } from "@/components/lobex/ui";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard — LOBEX SMM" }] }),
  component: AdminHome,
});

function AdminHome() {
  const { data: s } = useAdminQuery<any>(["stats"], adminStats);
  return (
    <>
      <PageHeader title="Admin Dashboard" sub="LOBEX SMM overview" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat accent label="Revenue" value={money(s?.revenue, 2)} icon={<DollarSign className="h-5 w-5" />} />
        <Stat label="Profit" value={money(s?.profit, 2)} icon={<TrendingUp className="h-5 w-5" />} />
        <Stat label="Users" value={s?.users ?? 0} icon={<Users className="h-5 w-5" />} />
        <Stat label="Orders" value={s?.orders ?? 0} icon={<ShoppingBag className="h-5 w-5" />} />
        <Stat label="User balances" value={money(s?.userBalances, 2)} icon={<Wallet className="h-5 w-5" />} />
        <Stat label="Pending payments" value={s?.pendingPayments ?? 0} icon={<CreditCard className="h-5 w-5" />} />
        <Stat label="Open tickets" value={s?.openTickets ?? 0} icon={<LifeBuoy className="h-5 w-5" />} />
      </div>
      <h2 className="mb-3 mt-8 text-lg font-semibold">Admin activity log</h2>
      <DataTable head={["Date", "Action", "Details"]} empty={!s?.logs.length}>
        {s?.logs.map((l: any) => (
          <tr key={l.id}>
            <td className={td + " whitespace-nowrap text-muted-foreground"}>{fdate(l.created_at)}</td>
            <td className={td + " font-mono text-primary"}>{l.action}</td>
            <td className={td + " max-w-md truncate font-mono text-xs text-muted-foreground"}>{JSON.stringify(l.details)}</td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
