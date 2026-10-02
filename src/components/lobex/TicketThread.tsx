import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { replyTicket } from "@/lib/customer.functions";
import { Panel, StatusBadge, fdate } from "./ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TicketThread({ ticketId }: { ticketId: number }) {
  const reply = useServerFn(replyTicket);
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const { data } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      const [{ data: t }, { data: m }] = await Promise.all([
        supabase.from("tickets").select("*").eq("id", ticketId).maybeSingle(),
        supabase.from("ticket_messages").select("*").eq("ticket_id", ticketId).order("id"),
      ]);
      return { ticket: t, messages: m ?? [] };
    },
  });

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await reply({ data: { ticketId, body } });
      setBody("");
      qc.invalidateQueries();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!data?.ticket) return <Panel>Loading…</Panel>;
  return (
    <Panel className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">#{data.ticket.id} · {data.ticket.subject}</h2>
        <StatusBadge status={data.ticket.status} />
      </div>
      <div className="max-h-[55vh] space-y-3 overflow-y-auto">
        {data.messages.map((m) => (
          <div key={m.id} className={cn("max-w-[85%] rounded-xl p-3 text-sm", m.is_admin ? "bg-accent text-accent-foreground" : "ms-auto bg-surface-2")}>
            <div className="mb-1 text-[11px] text-muted-foreground">{m.is_admin ? "LOBEX SMM Support" : "You"} · {fdate(m.created_at)}</div>
            <p className="whitespace-pre-line">{m.body}</p>
          </div>
        ))}
      </div>
      {data.ticket.status !== "closed" && (
        <form onSubmit={send} className="space-y-2">
          <textarea className="field min-h-24" value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} required />
          <Button type="submit" disabled={busy}>Send reply</Button>
        </form>
      )}
    </Panel>
  );
}
