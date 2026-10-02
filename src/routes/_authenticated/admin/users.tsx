import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { adminUsers, adminAdjustBalance, adminSetUserFlags } from "@/lib/admin.functions";
import { useAdminAction, useAdminQuery } from "@/components/lobex/useAdmin";
import { DataTable, Field, PageHeader, money, td, fdate } from "@/components/lobex/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — LOBEX SMM Admin" }] }),
  component: UsersPage,
});

function UsersPage() {
  const { data } = useAdminQuery<any[]>(["users"], adminUsers);
  const adjust = useAdminAction(adminAdjustBalance);
  const flags = useAdminAction(adminSetUserFlags);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const rows = (data ?? []).filter((u) => !q || (u.email ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title="Users" actions={<input className="field w-64" placeholder="Search email" value={q} onChange={(e) => setQ(e.target.value)} />} />
      <DataTable head={["Email", "Name", "Balance", "Spent", "Role", "Status", "Joined", ""]} empty={!rows.length}>
        {rows.map((u) => (
          <tr key={u.id}>
            <td className={td}>{u.email}</td>
            <td className={td}>{u.display_name}</td>
            <td className={td + " font-semibold"}>{money(u.balance)}</td>
            <td className={td}>{money(u.spent, 2)}</td>
            <td className={td}>{u.isAdmin ? <span className="text-primary">Admin</span> : "User"}</td>
            <td className={td}>{u.banned ? <span className="text-destructive">Suspended</span> : "Active"}</td>
            <td className={td + " text-muted-foreground"}>{fdate(u.created_at)}</td>
            <td className={td + " whitespace-nowrap space-x-2"}>
              <Button size="sm" variant="outline" onClick={() => { setEdit(u); setAmount(""); setNote(""); }}>Balance</Button>
              <Button size="sm" variant="ghost" onClick={() => flags({ userId: u.id, banned: !u.banned })}>{u.banned ? "Unsuspend" : "Suspend"}</Button>
              <Button size="sm" variant="ghost" onClick={() => flags({ userId: u.id, admin: !u.isAdmin })}>{u.isAdmin ? "Remove admin" : "Make admin"}</Button>
            </td>
          </tr>
        ))}
      </DataTable>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust balance — {edit?.email}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Current: {money(edit?.balance)}. Use a negative amount to deduct.</p>
          <Field label="Amount"><input className="field" type="number" step="0.0001" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Note"><input className="field" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} /></Field>
          <Button onClick={async () => { await adjust({ userId: edit.id, amount: Number(amount), note }, "Balance updated"); setEdit(null); }} disabled={!Number(amount)}>Apply</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
