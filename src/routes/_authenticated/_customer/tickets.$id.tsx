import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { TicketThread } from "@/components/lobex/TicketThread";

export const Route = createFileRoute("/_authenticated/_customer/tickets/$id")({
  head: () => ({ meta: [{ title: "Ticket — LOBEX SMM" }] }),
  component: TicketPage,
});

function TicketPage() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-4">
      <Link to="/tickets" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> Tickets
      </Link>
      <TicketThread ticketId={Number(id)} />
    </div>
  );
}
