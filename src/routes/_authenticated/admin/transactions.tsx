import { createFileRoute } from "@tanstack/react-router";
import { adminTransactions } from "@/lib/admin.functions";
import { useAdminQuery } from "@/components/lobex/useAdmin";
import { DataTable, PageHeader, money, td, fdate } from "@/components/lobex/ui";

export const Route = createFileRoute("/_authenticated/admin/transactions")({
  head: () => ({ meta: [{ title: "Transactions — LOBEX SMM Admin" }] }),
  component: TxAdmin,
});

function TxAdmin() {
  const { data } = useAdminQuery<any[]>(["transactions"], adminTransactions);
  return (
    <>
      <PageHeader title="Transactions" sub="Every balance movement across all users." />
      <DataTable head={["ID", "Date", "User", "Type", "Description", "Amount", "Balance after"]} empty={!data?.length}>
        {data?.map((x) => (
          <tr key={x.id}>
            <td className={td + " font-mono"}>#{x.id}</td>
            <td className={td + " whitespace-nowrap text-muted-foreground"}>{fdate(x.created_at)}</td>
            <td className={td + " text-xs"}>{x.email}</td>
            <td className={td + " capitalize"}>{x.type.replace("_", " ")}</td>
            <td className={td}>{x.description}</td>
            <td className={td + (Number(x.amount) >= 0 ? " text-success" : " text-destructive")}>{money(x.amount)}</td>
            <td className={td}>{money(x.balance_after)}</td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
