import { createFileRoute } from "@tanstack/react-router";
import { handle } from "@/lib/reseller-api";

export const Route = createFileRoute("/api/public/v2")({
  server: { handlers: { POST: ({ request }) => handle(request), GET: ({ request }) => handle(request) } },
});
