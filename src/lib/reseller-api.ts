import { z } from "zod";

// LOBEX SMM public API v2 (standard SMM panel format). Authenticated by per-user API key.
export async function handle(request: Request) {
  const ct = request.headers.get("content-type") ?? "";
  let params: any = {};
  if (request.method === "GET") {
    params = Object.fromEntries(new URL(request.url).searchParams);
  } else if (ct.includes("application/json")) {
    params = (await request.json().catch(() => ({}))) as Record<string, string>;
  } else {
    params = Object.fromEntries((await request.formData().catch(() => new FormData())) as any);
  }
  const json = (b: unknown, status = 200) => Response.json(b, { status });
  const key = String(params.key ?? "");
  const action = String(params.action ?? "");
  if (!/^lbx_[a-f0-9]{32}$/.test(key)) return json({ error: "Invalid API key" }, 401);

  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: enabled } = await db.from("settings").select("value").eq("key", "api_enabled").single();
  if (enabled?.value !== "true") return json({ error: "API is disabled" }, 403);
  const { data: k } = await db.from("api_keys").select("user_id").eq("key", key).maybeSingle();
  if (!k) return json({ error: "Invalid API key" }, 401);
  const userId = k.user_id;
  const { data: currency } = await db.from("settings").select("value").eq("key", "currency").single();

  try {
    switch (action) {
      case "services": {
        const [{ data: svcs }, { data: cats }] = await Promise.all([
          db.from("services").select("id, name, category_id, rate, min_qty, max_qty, refill, cancel").eq("enabled", true).order("id"),
          db.from("categories").select("id, name"),
        ]);
        return json(
          (svcs ?? []).map((s) => ({
            service: s.id,
            name: s.name,
            type: "Default",
            category: cats?.find((c) => c.id === s.category_id)?.name ?? "Other",
            rate: Number(s.rate).toFixed(4),
            min: String(s.min_qty),
            max: String(s.max_qty),
            refill: s.refill,
            cancel: s.cancel,
          })),
        );
      }
      case "add": {
        const p = z
          .object({ service: z.coerce.number().int(), link: z.string().url().max(500), quantity: z.coerce.number().int().positive() })
          .parse(params);
        const { placeOrder } = await import("@/lib/order-engine.server");
        const r = await placeOrder(userId, p.service, p.link, p.quantity);
        return json({ order: r.orderId });
      }
      case "status": {
        const ids = String(params.orders ?? params.order ?? "")
          .split(",")
          .map((s) => parseInt(s, 10))
          .filter((n) => Number.isFinite(n))
          .slice(0, 100);
        if (!ids.length) return json({ error: "Incorrect order ID" });
        const { data: rows } = await db
          .from("orders")
          .select("id, charge, start_count, remains, status")
          .eq("user_id", userId)
          .in("id", ids);
        const fmt = (o: any) => ({
          charge: Number(o.charge).toFixed(4),
          start_count: String(o.start_count ?? 0),
          status: ({ completed: "Completed", in_progress: "In progress", partial: "Partial", canceled: "Canceled", failed: "Canceled" } as any)[o.status] ?? "Pending",
          remains: String(o.remains ?? 0),
          currency: currency?.value ?? "USD",
        });
        if (params.order && !params.orders) {
          const o = rows?.[0];
          return json(o ? fmt(o) : { error: "Incorrect order ID" });
        }
        return json(Object.fromEntries(ids.map((id) => {
          const o = rows?.find((r) => r.id === id);
          return [id, o ? fmt(o) : { error: "Incorrect order ID" }];
        })));
      }
      case "balance": {
        const { data: w } = await db.from("wallets").select("balance").eq("user_id", userId).single();
        return json({ balance: Number(w?.balance ?? 0).toFixed(4), currency: currency?.value ?? "USD" });
      }
      case "refill":
      case "cancel": {
        const id = parseInt(String(params.order ?? params.orders ?? "").split(",")[0] ?? "", 10);
        const { providerAction } = await import("@/lib/order-engine.server");
        await providerAction(id, action, userId);
        return json(action === "refill" ? { refill: id } : [{ order: id, cancel: 1 }]);
      }
      default:
        return json({ error: "Incorrect request" }, 400);
    }
  } catch (e: any) {
    return json({ error: e?.issues ? "Invalid parameters" : e?.message ?? "Error" }, 400);
  }
}

