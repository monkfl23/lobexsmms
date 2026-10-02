import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { placeOrder, syncOrders, providerAction } from "./order-engine.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Customer-safe service catalog — never includes provider data. */
export const listServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const db = await admin();
    const [{ data: cats }, { data: svcs }] = await Promise.all([
      db.from("categories").select("id, name, sort").eq("enabled", true).order("sort").order("id"),
      db
        .from("services")
        .select("id, name, description, category_id, rate, min_qty, max_qty, refill, cancel")
        .eq("enabled", true)
        .order("id"),
    ]);
    return { categories: cats ?? [], services: (svcs ?? []).map((s) => ({ ...s, rate: Number(s.rate) })) };
  });

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        serviceId: z.number().int().positive(),
        link: z.string().trim().min(4).max(500).url(),
        quantity: z.number().int().positive().max(100_000_000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => placeOrder(context.userId, data.serviceId, data.link, data.quantity));

export const syncMyOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => syncOrders({ userId: context.userId, limit: 100 }));

export const orderAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.number().int(), action: z.enum(["refill", "cancel"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await providerAction(data.orderId, data.action, context.userId);
    return { ok: true };
  });

export const requestPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        amount: z.number().positive().max(100000),
        method: z.string().trim().min(2).max(50),
        reference: z.string().trim().min(2).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: min } = await db.from("settings").select("value").eq("key", "min_deposit").single();
    if (data.amount < Number(min?.value ?? 1)) throw new Error(`Minimum deposit is ${min?.value}`);
    const { error } = await db.from("payments").insert({ user_id: context.userId, ...data });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ subject: z.string().trim().min(3).max(150), body: z.string().trim().min(3).max(4000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: t, error } = await db
      .from("tickets")
      .insert({ user_id: context.userId, subject: data.subject })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await db.from("ticket_messages").insert({ ticket_id: t.id, user_id: context.userId, body: data.body });
    return { id: t.id };
  });

export const replyTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ticketId: z.number().int(), body: z.string().trim().min(1).max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const { data: t } = await db.from("tickets").select("id, user_id, status").eq("id", data.ticketId).single();
    if (!t || (t.user_id !== context.userId && !isAdmin)) throw new Error("Ticket not found");
    const asAdmin = !!isAdmin && t.user_id !== context.userId;
    await db
      .from("ticket_messages")
      .insert({ ticket_id: t.id, user_id: context.userId, body: data.body, is_admin: asAdmin });
    await db
      .from("tickets")
      .update({ status: asAdmin ? "answered" : "open", updated_at: new Date().toISOString() })
      .eq("id", t.id);
    return { ok: true };
  });

export const regenerateApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const key = "lbx_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    await db.from("api_keys").upsert({ user_id: context.userId, key });
    return { key };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ display_name: z.string().trim().min(1).max(60) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    await db.from("profiles").update({ display_name: data.display_name }).eq("id", context.userId);
    return { ok: true };
  });
