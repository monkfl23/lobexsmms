import { createFileRoute } from "@tanstack/react-router";
import { handle } from "@/lib/reseller-api";

// Short public alias: https://<domain>/v2 (same handler as /api/public/v2)
export const Route = createFileRoute("/v2")({
  server: { handlers: { POST: ({ request }) => handle(request), GET: ({ request }) => handle(request) } },
});
