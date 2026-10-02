import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { adminTickets, adminSetTicketStatus } from "@/lib/admin.functions";
import { useAdminAction, useAdminQuery } from "@/components/lobex/useAdmin";
import { PageHeader, Panel, StatusBadge, fdate } from "@/components/lobex/ui";
import { TicketThread } from "@/components/lobex/TicketThread";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/tickets")({
  head: () => ({ meta: [{ title: "Tickets — LOBEX SMM Admin" }] }),
  component: TicketsAdmin,
});

function TicketsAdmin() {
  const { data } = useAdminQuery<any[]>(["tickets"], adminTickets);
  const setStatus = useAdminAction(adminSetTicketStatus);
  const [sel, setSel] = useState<number | null>(null);
  const current = data?.find((t) => t.id === sel);

  return (
    <>
      <PageHeader title="Tickets" />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-2 lg:col-span-2">
          {!data?.length && <Panel>No tickets yet.</Panel>}
          {data?.map((t) => (
            <button key={t.id} onClick={() => setSel(t.id)} className={cn("panel block w-full p-4 text-start transition-shadow hover:shadow-glow", sel === t.id && "panel-glow")}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">#{t.id} · {t.subject}</span>
                <StatusBadge status={t.status} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{t.email} · {fdate(t.updated_at)}</div>
            </button>
          ))}
        </div>
        <div className="lg:col-span-3 space-y-3">
          {current ? (
            <>
              <div className="flex gap-2">
                {(["open", "answered", "closed"] as const).map((s) => (
                  <Button key={s} size="sm" variant={current.status === s ? "default" : "outline"} onClick={() => setStatus({ id: current.id, status: s }, "")} className="capitalize">{s}</Button>
                ))}
              </div>
              <TicketThread ticketId={current.id} />
            </>
          ) : <Panel>Select a ticket to view and reply.</Panel>}
        </div>
      </div>
    </>
  );
}
