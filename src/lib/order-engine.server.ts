import { callProvider, normalizeStatus, ProviderUnknownError } from "./smm-provider.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Full order pipeline: validate + atomic debit, send to provider, save provider ID, refund on failure. */
export async function placeOrder(userId: string, serviceId: number, link: string, quantity: number) {
  const db = await admin();
  const { data: prof } = await db.from("profiles").select("banned").eq("id", userId).single();
  if (prof?.banned) throw new Error("Account suspended");

  const { data: orderId, error } = await db.rpc("place_order_debit", {
    _user: userId,
    _service: serviceId,
    _link: link,
    _qty: quantity,
  });
  if (error) throw new Error(error.message);

  const { data: svc } = await db
    .from("services")
    .select("provider_service_id, providers(api_url, api_key, enabled)")
    .eq("id", serviceId)
    .single();
  const prov = (svc as any)?.providers;
  // Always send the provider's own service ID (e.g. 2818), never our internal services.id.
  const providerServiceId = String(svc?.provider_service_id ?? "").trim();
  try {
    if (!prov || !prov.enabled) throw new Error("Provider unavailable");
    if (!providerServiceId) throw new Error("Service is not mapped to a provider service ID");
    const res = await callProvider<any>(prov, "add", {
      service: providerServiceId,
      link: link.trim(),
      quantity: Math.trunc(quantity),
    });
    const providerOrder = res?.order ?? res?.order_id ?? res?.data?.order ?? res?.id;
    if (providerOrder === undefined || providerOrder === null || providerOrder === "") {
      throw new Error(`Provider did not return an order ID: ${JSON.stringify(res).slice(0, 200)}`);
    }
    await db
      .from("orders")
      .update({ provider_order_id: String(providerOrder), status: "pending", error: null, updated_at: new Date().toISOString() })
      .eq("id", orderId as number);
    return { orderId: orderId as number };
  } catch (e: any) {
    const msg = e?.message ?? "Provider error";
    if (e instanceof ProviderUnknownError) {
      // Outcome unknown (timeout / network / unparseable 2xx): the provider may have created it.
      // Keep the charge and flag for admin review instead of refunding.
      await db.from("orders").update({ error: `Needs review: ${msg}`, updated_at: new Date().toISOString() }).eq("id", orderId as number);
      throw new Error(`Order #${orderId} submitted but provider response was unclear (${msg}). It is under review.`);
    }
    await db.from("orders").update({ status: "failed", error: msg }).eq("id", orderId as number);
    await db.rpc("refund_order", { _order: orderId as number, _amount: null as any, _reason: "provider error" });
    throw new Error(`Order failed and was refunded: ${msg}`);
  }
}

const OPEN = ["pending", "processing", "in_progress"];

/** Sync provider statuses for the given orders (or all open ones). Refunds canceled / partial remains. */
export async function syncOrders(filter: { userId?: string; limit?: number } = {}) {
  const db = await admin();
  let q = db
    .from("orders")
    .select("id, provider_order_id, provider_id, charge, quantity, status, refunded")
    .in("status", OPEN)
    .not("provider_order_id", "is", null)
    .order("id", { ascending: true })
    .limit(filter.limit ?? 200);
  if (filter.userId) q = q.eq("user_id", filter.userId);
  const { data: orders } = await q;
  if (!orders?.length) return { updated: 0 };

  const provIds = [...new Set(orders.map((o) => o.provider_id).filter(Boolean))] as string[];
  const { data: provs } = await db.from("providers").select("id, api_url, api_key").in("id", provIds);
  let updated = 0;
  for (const p of provs ?? []) {
    const list = orders.filter((o) => o.provider_id === p.id);
    for (let i = 0; i < list.length; i += 100) {
      const chunk = list.slice(i, i + 100);
      let res: Record<string, any> = {};
      try {
        res = await callProvider(p, "status", { orders: chunk.map((o) => o.provider_order_id).join(",") });
      } catch {
        continue;
      }
      for (const o of chunk) {
        const r = res[o.provider_order_id!];
        if (!r || r.error) continue;
        const status = normalizeStatus(r.status);
        const remains = r.remains != null ? parseInt(r.remains, 10) : null;
        await db
          .from("orders")
          .update({
            status,
            start_count: r.start_count != null ? parseInt(r.start_count, 10) : null,
            remains,
            updated_at: new Date().toISOString(),
          })
          .eq("id", o.id);
        if (!o.refunded && status === "canceled") {
          await db.rpc("refund_order", { _order: o.id, _amount: null as any, _reason: "canceled" });
        } else if (!o.refunded && status === "partial" && remains && remains > 0) {
          const amt = Math.round(((Number(o.charge) * remains) / o.quantity) * 10000) / 10000;
          await db.rpc("refund_order", { _order: o.id, _amount: amt, _reason: `partial, ${remains} remaining` });
        }
        updated++;
      }
    }
  }
  return { updated };
}

export async function providerAction(orderId: number, action: "refill" | "cancel", userId?: string) {
  const db = await admin();
  let q = db.from("orders").select("id, provider_order_id, provider_id, service_id, user_id").eq("id", orderId);
  if (userId) q = q.eq("user_id", userId);
  const { data: o } = await q.single();
  if (!o?.provider_order_id) throw new Error("Order not found");
  const { data: s } = await db.from("services").select("refill, cancel").eq("id", o.service_id!).single();
  if (action === "refill" && !s?.refill) throw new Error("Refill not supported for this service");
  if (action === "cancel" && !s?.cancel) throw new Error("Cancel not supported for this service");
  const { data: p } = await db.from("providers").select("api_url, api_key").eq("id", o.provider_id!).single();
  if (!p) throw new Error("Provider missing");
  const res: any =
    action === "refill"
      ? await callProvider(p, "refill", { order: o.provider_order_id })
      : await callProvider(p, "cancel", { orders: o.provider_order_id });
  return res;
}
