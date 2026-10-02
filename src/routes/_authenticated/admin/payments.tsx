import { createFileRoute } from "@tanstack/react-router";
import { adminPayments, adminProcessPayment } from "@/lib/admin.functions";
import { useAdminAction, useAdminQuery } from "@/components/lobex/useAdmin";
import { DataTable, PageHeader, StatusBadge, money, td, fdate } from "@/components/lobex/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  head: () => ({ meta: [{ title: "Payments — LOBEX SMM Admin" }] }),
  component: PaymentsAdmin,
});

function PaymentsAdmin() {
  const { data } = useAdminQuery<any[]>(["payments"], adminPayments);
  const process = useAdminAction(adminProcessPayment);
  return (
    <>
      <PageHeader title="Payments" sub="Approve deposit requests to credit user balances." />
      <DataTable head={["ID", "Date", "User", "Method", "Reference", "Amount", "Status", ""]} empty={!data?.length}>
        {data?.map((p) => (
          <tr key={p.id}>
            <td className={td + " font-mono"}>#{p.id}</td>
            <td className={td + " whitespace-nowrap text-muted-foreground"}>{fdate(p.created_at)}</td>
            <td className={td + " text-xs"}>{p.email}</td>
            <td className={td}>{p.method}</td>
            <td className={td + " max-w-[220px] break-all font-mono text-xs"}>{p.reference}</td>
            <td className={td + " font-semibold"}>{money(p.amount, 2)}</td>
            <td className={td}><StatusBadge status={p.status} />{p.admin_note && <div className="text-[11px] text-muted-foreground">{p.admin_note}</div>}</td>
            <td className={td + " whitespace-nowrap"}>
              {p.status === "pending" && (
                <>
                  <Button size="sm" onClick={() => confirm(`Approve ${money(p.amount, 2)} for ${p.email}?`) && process({ id: p.id, approve: true, note: "" }, "Approved and credited")}>Approve</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { const n = prompt("Reason for rejection"); if (n !== null) process({ id: p.id, approve: false, note: n }, "Rejected"); }}>Reject</Button>
                </>
              )}
            </td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
