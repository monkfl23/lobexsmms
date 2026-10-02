import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { DataTable, PageHeader, money, td, fdate } from "@/components/lobex/ui";

export const Route = createFileRoute("/_authenticated/_customer/transactions")({
  head: () => ({ meta: [{ title: "Transactions — LOBEX SMM" }] }),
  component: Transactions,
});

function Transactions() {
  const { t } = useI18n();
  const { user } = Route.useRouteContext();
  const { data } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => (await supabase.from("transactions").select("*").eq("user_id", user.id).order("id", { ascending: false }).limit(300)).data ?? [],
  });
  return (
    <>
      <PageHeader title={t("transactions")} />
      <DataTable head={["ID", t("date"), "Type", t("description"), t("amount"), t("balance")]} empty={!data?.length}>
        {data?.map((x) => (
          <tr key={x.id}>
            <td className={td + " font-mono"}>#{x.id}</td>
            <td className={td + " text-muted-foreground"}>{fdate(x.created_at)}</td>
            <td className={td + " capitalize"}>{x.type.replace("_", " ")}</td>
            <td className={td}>{x.description}</td>
            <td className={td + (Number(x.amount) >= 0 ? " text-success" : " text-destructive")}>{Number(x.amount) >= 0 ? "+" : ""}{money(x.amount)}</td>
            <td className={td}>{money(x.balance_after)}</td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
