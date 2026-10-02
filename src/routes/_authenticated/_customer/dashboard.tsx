import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PlusCircle, ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { DataTable, PageHeader, Stat, StatusBadge, money, td, fdate } from "@/components/lobex/ui";

export const Route = createFileRoute("/_authenticated/_customer/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — LOBEX SMM" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { t } = useI18n();
  const { user } = Route.useRouteContext();
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [{ data: w }, { count }, { data: recent }, { data: ann }] = await Promise.all([
        supabase.from("wallets").select("balance, spent").eq("user_id", user.id).maybeSingle(),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("orders").select("id, service_name, quantity, charge, status, created_at").eq("user_id", user.id).order("id", { ascending: false }).limit(8),
        supabase.from("settings").select("value").eq("key", "announcement").maybeSingle(),
      ]);
      return { w, count: count ?? 0, recent: recent ?? [], announcement: ann?.value ?? "" };
    },
  });

  return (
    <>
      <PageHeader
        title={t("dashboard")}
        actions={
          <Link to="/new-order" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
            <PlusCircle className="h-4 w-4" /> {t("newOrder")}
          </Link>
        }
      />
      {data?.announcement && <div className="panel mb-6 border-primary/40 p-4 text-sm">{data.announcement}</div>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat accent label={t("balance")} value={money(data?.w?.balance, 2)} icon={<Wallet className="h-5 w-5" />} />
        <Stat label={t("spent")} value={money(data?.w?.spent, 2)} icon={<TrendingUp className="h-5 w-5" />} />
        <Stat label={t("totalOrders")} value={data?.count ?? 0} icon={<ShoppingBag className="h-5 w-5" />} />
      </div>
      <h2 className="mb-3 mt-8 text-lg font-semibold">{t("recentOrders")}</h2>
      <DataTable head={["ID", t("service"), t("quantity"), t("amount"), t("status"), t("date")]} empty={!data?.recent.length}>
        {data?.recent.map((o) => (
          <tr key={o.id}>
            <td className={td + " font-mono text-primary"}>#{o.id}</td>
            <td className={td}>{o.service_name}</td>
            <td className={td}>{o.quantity.toLocaleString()}</td>
            <td className={td}>{money(o.charge)}</td>
            <td className={td}><StatusBadge status={o.status} /></td>
            <td className={td + " text-muted-foreground"}>{fdate(o.created_at)}</td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
