import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callProvider } from "./smm-provider.server";
import { syncOrders, providerAction } from "./order-engine.server";

type Ctx = { supabase: any; userId: string };

async function gate(context: Ctx) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const log = (action: string, details: Record<string, unknown> = {}) =>
    supabaseAdmin.from("admin_logs").insert({ admin_id: context.userId, action, details: details as any });
  return { db: supabaseAdmin, log };
}

const v =
  <T extends z.ZodTypeAny>(schema: T) =>
  (d: unknown) =>
    schema.parse(d) as z.infer<T>;

const none = z.object({}).optional();

/* ---------------- Dashboard ---------------- */
export const adminStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(none))
  .handler(async ({ context }) => {
  const { db } = await gate(context);
  const [users, orders, pending, wallets, revenue, cost, tickets, logs] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("orders").select("id", { count: "exact", head: true }),
    db.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("wallets").select("balance"),
    db.from("orders").select("charge").eq("refunded", false).neq("status", "failed"),
    db.from("orders").select("provider_cost").eq("refunded", false).neq("status", "failed"),
    db.from("tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
    db.from("admin_logs").select("id, action, details, created_at").order("id", { ascending: false }).limit(10),
  ]);
  const sum = (rows: any[] | null, k: string) => (rows ?? []).reduce((a, r) => a + Number(r[k]), 0);
  return {
    users: users.count ?? 0,
    orders: orders.count ?? 0,
    pendingPayments: pending.count ?? 0,
    openTickets: tickets.count ?? 0,
    userBalances: sum(wallets.data, "balance"),
    revenue: sum(revenue.data, "charge"),
    profit: sum(revenue.data, "charge") - sum(cost.data, "provider_cost"),
    logs: logs.data ?? [],
  };
});

/* ---------------- Users ---------------- */
export const adminUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(none))
  .handler(async ({ context }) => {
  const { db } = await gate(context);
  const [{ data: profiles }, { data: wallets }, { data: roles }] = await Promise.all([
    db.from("profiles").select("*").order("created_at", { ascending: false }),
    db.from("wallets").select("*"),
    db.from("user_roles").select("user_id, role"),
  ]);
  return (profiles ?? []).map((p) => ({
    ...p,
    balance: Number(wallets?.find((w) => w.user_id === p.id)?.balance ?? 0),
    spent: Number(wallets?.find((w) => w.user_id === p.id)?.spent ?? 0),
    isAdmin: !!roles?.find((r) => r.user_id === p.id && r.role === "admin"),
  }));
});

export const adminAdjustBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(
  z.object({ userId: z.string().uuid(), amount: z.number().refine((n) => n !== 0), note: z.string().max(200) }),
))
  .handler(async ({ data, context }) => {
  const { db, log } = await gate(context);
  const { error } = await db.rpc("adjust_balance", {
    _user: data.userId,
    _amount: data.amount,
    _type: data.amount > 0 ? "admin_credit" : "admin_debit",
    _desc: data.note || "Balance adjustment by admin",
  });
  if (error) throw new Error(error.message);
  await log("adjust_balance", data);
  return { ok: true };
});

export const adminSetUserFlags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(
  z.object({ userId: z.string().uuid(), banned: z.boolean().optional(), admin: z.boolean().optional() }),
))
  .handler(async ({ data, context }) => {
  const { db, log } = await gate(context);
  if (data.userId === context.userId && data.admin === false) throw new Error("You cannot remove your own admin role");
  if (data.banned !== undefined) await db.from("profiles").update({ banned: data.banned }).eq("id", data.userId);
  if (data.admin === true) await db.from("user_roles").upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
  if (data.admin === false) await db.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
  await log("user_flags", data);
  return { ok: true };
});

/* ---------------- Providers ---------------- */
export const adminProviders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(none))
  .handler(async ({ context }) => {
  const { db } = await gate(context);
  const { data } = await db.from("providers").select("*").order("created_at");
  // Mask keys even for admins in list responses
  return (data ?? []).map((p) => ({ ...p, api_key: p.api_key.slice(0, 4) + "••••••" + p.api_key.slice(-4) }));
});

const providerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  api_url: z.string().trim().url().max(300),
  api_key: z.string().trim().max(300).optional(),
  currency: z.string().trim().min(1).max(8),
  enabled: z.boolean(),
});

export const adminSaveProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(providerSchema))
  .handler(async ({ data, context }) => {
  const { db, log } = await gate(context);
  const { id, api_key, ...rest } = data;
  if (id) {
    const patch: any = { ...rest };
    if (api_key) patch.api_key = api_key;
    await db.from("providers").update(patch).eq("id", id);
  } else {
    if (!api_key) throw new Error("API key is required");
    await db.from("providers").insert({ ...rest, api_key });
  }
  await log(id ? "provider_update" : "provider_create", { name: data.name });
  return { ok: true };
});

export const adminDeleteProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(z.object({ id: z.string().uuid() })))
  .handler(async ({ data, context }) => {
  const { db, log } = await gate(context);
  await db.from("providers").delete().eq("id", data.id);
  await log("provider_delete", data);
  return { ok: true };
});

export const adminProviderBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(z.object({ id: z.string().uuid() })))
  .handler(async ({ data, context }) => {
  const { db } = await gate(context);
  const { data: p } = await db.from("providers").select("api_url, api_key").eq("id", data.id).single();
  if (!p) throw new Error("Provider not found");
  const res = await callProvider<{ balance: string; currency: string }>(p, "balance");
  await db
    .from("providers")
    .update({ last_balance: Number(res.balance), last_checked_at: new Date().toISOString() })
    .eq("id", data.id);
  return { balance: Number(res.balance), currency: res.currency };
});

export const adminProviderServices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(z.object({ id: z.string().uuid() })))
  .handler(async ({ data, context }) => {
  const { db } = await gate(context);
  const { data: p } = await db.from("providers").select("api_url, api_key").eq("id", data.id).single();
  if (!p) throw new Error("Provider not found");
  const res = await callProvider<any[]>(p, "services");
  if (!Array.isArray(res)) throw new Error("Unexpected services response");
  return res.slice(0, 3000).map((s) => ({
    service: String(s.service),
    name: String(s.name ?? ""),
    category: String(s.category ?? "Other"),
    rate: Number(s.rate ?? 0),
    min: Number(s.min ?? 1),
    max: Number(s.max ?? 1),
    refill: !!s.refill,
    cancel: !!s.cancel,
    type: String(s.type ?? ""),
  }));
});

export const adminImportServices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(
  z.object({
    providerId: z.string().uuid(),
    markupPercent: z.number().min(0).max(1000),
    items: z
      .array(
        z.object({
          service: z.string(),
          name: z.string().max(300),
          category: z.string().max(150),
          rate: z.number(),
          min: z.number(),
          max: z.number(),
          refill: z.boolean(),
          cancel: z.boolean(),
        }),
      )
      .min(1)
      .max(1000),
  }),
))
  .handler(async ({ data, context }) => {
  const { db, log } = await gate(context);
  const { data: cats } = await db.from("categories").select("id, name");
  const map = new Map((cats ?? []).map((c) => [c.name.toLowerCase(), c.id]));
  for (const name of [...new Set(data.items.map((i) => i.category))]) {
    if (!map.has(name.toLowerCase())) {
      const { data: c } = await db.from("categories").insert({ name }).select("id").single();
      if (c) map.set(name.toLowerCase(), c.id);
    }
  }
  const rows = data.items.map((i) => ({
    name: i.name,
    category_id: map.get(i.category.toLowerCase()) ?? null,
    provider_id: data.providerId,
    provider_service_id: i.service,
    provider_rate: i.rate,
    rate: Math.round(i.rate * (1 + data.markupPercent / 100) * 10000) / 10000,
    min_qty: Math.max(1, Math.floor(i.min)),
    max_qty: Math.max(1, Math.floor(i.max)),
    refill: i.refill,
    cancel: i.cancel,
  }));
  const { error } = await db.from("services").insert(rows);
  if (error) throw new Error(error.message);
  await log("services_import", { providerId: data.providerId, count: rows.length });
  return { imported: rows.length };
});

/* ---------------- Categories ---------------- */
export const adminCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(none))
  .handler(async ({ context }) => {
  const { db } = await gate(context);
  const { data } = await db.from("categories").select("*").order("sort").order("id");
  return data ?? [];
});

export const adminSaveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(
  z.object({ id: z.number().int().optional(), name: z.string().trim().min(1).max(150), sort: z.number().int(), enabled: z.boolean() }),
))
  .handler(async ({ data, context }) => {
  const { db, log } = await gate(context);
  const { id, ...rest } = data;
  if (id) await db.from("categories").update(rest).eq("id", id);
  else await db.from("categories").insert(rest);
  await log("category_save", data);
  return { ok: true };
});

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(z.object({ id: z.number().int() })))
  .handler(async ({ data, context }) => {
  const { db, log } = await gate(context);
  await db.from("categories").delete().eq("id", data.id);
  await log("category_delete", data);
  return { ok: true };
});

/* ---------------- Services ---------------- */
export const adminServices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(none))
  .handler(async ({ context }) => {
  const { db } = await gate(context);
  const { data } = await db.from("services").select("*").order("id");
  return (data ?? []).map((s) => ({ ...s, rate: Number(s.rate), provider_rate: Number(s.provider_rate) }));
});

const serviceSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().trim().min(1).max(300),
  description: z.string().max(4000),
  category_id: z.number().int().nullable(),
  provider_id: z.string().uuid().nullable(),
  provider_service_id: z.string().trim().max(50).nullable(),
  provider_rate: z.number().min(0),
  rate: z.number().min(0),
  min_qty: z.number().int().min(1),
  max_qty: z.number().int().min(1),
  refill: z.boolean(),
  cancel: z.boolean(),
  enabled: z.boolean(),
});

export const adminSaveService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(serviceSchema))
  .handler(async ({ data, context }) => {
  const { db, log } = await gate(context);
  if (data.min_qty > data.max_qty) throw new Error("Min cannot exceed max");
  const { id, ...rest } = data;
  const { error } = id ? await db.from("services").update(rest).eq("id", id) : await db.from("services").insert(rest);
  if (error) throw new Error(error.message);
  await log(id ? "service_update" : "service_create", { id, name: data.name });
  return { ok: true };
});

export const adminToggleService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(z.object({ id: z.number().int(), enabled: z.boolean() })))
  .handler(
  async ({ data, context }) => {
    const { db, log } = await gate(context);
    await db.from("services").update({ enabled: data.enabled }).eq("id", data.id);
    await log("service_toggle", data);
    return { ok: true };
  },
);

export const adminDeleteService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(z.object({ id: z.number().int() })))
  .handler(async ({ data, context }) => {
  const { db, log } = await gate(context);
  await db.from("services").delete().eq("id", data.id);
  await log("service_delete", data);
  return { ok: true };
});

/* ---------------- Orders ---------------- */
export const adminOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(z.object({ status: z.string().optional(), search: z.string().optional() })))
  .handler(
  async ({ data, context }) => {
    const { db } = await gate(context);
    let q = db.from("orders").select("*").order("id", { ascending: false }).limit(300);
    if (data.status) q = q.eq("status", data.status);
    if (data.search && /^\d+$/.test(data.search)) q = q.eq("id", Number(data.search));
    const { data: rows } = await q;
    const ids = [...new Set((rows ?? []).map((r) => r.user_id))];
    const { data: profs } = await db.from("profiles").select("id, email").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    return (rows ?? []).map((r) => ({ ...r, email: profs?.find((p) => p.id === r.user_id)?.email ?? "" }));
  },
);

export const adminSyncOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(none))
  .handler(async ({ context }) => {
  await gate(context);
  return syncOrders({ limit: 500 });
});

export const adminOrderAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(
  z.object({ orderId: z.number().int(), action: z.enum(["refill", "cancel", "refund", "mark_completed"]) }),
))
  .handler(async ({ data, context }) => {
  const { db, log } = await gate(context);
  if (data.action === "refund") {
    await db.rpc("refund_order", { _order: data.orderId, _amount: null as any, _reason: "admin refund" });
    await db.from("orders").update({ status: "canceled" }).eq("id", data.orderId);
  } else if (data.action === "mark_completed") {
    await db.from("orders").update({ status: "completed", remains: 0 }).eq("id", data.orderId);
  } else {
    await providerAction(data.orderId, data.action);
  }
  await log("order_" + data.action, data);
  return { ok: true };
});

/* ---------------- Transactions & payments ---------------- */
export const adminTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(none))
  .handler(async ({ context }) => {
  const { db } = await gate(context);
  const { data } = await db.from("transactions").select("*").order("id", { ascending: false }).limit(500);
  const ids = [...new Set((data ?? []).map((r) => r.user_id))];
  const { data: profs } = await db.from("profiles").select("id, email").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  return (data ?? []).map((r) => ({ ...r, email: profs?.find((p) => p.id === r.user_id)?.email ?? "" }));
});

export const adminPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(none))
  .handler(async ({ context }) => {
  const { db } = await gate(context);
  const { data } = await db.from("payments").select("*").order("id", { ascending: false }).limit(500);
  const ids = [...new Set((data ?? []).map((r) => r.user_id))];
  const { data: profs } = await db.from("profiles").select("id, email").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  return (data ?? []).map((r) => ({ ...r, email: profs?.find((p) => p.id === r.user_id)?.email ?? "" }));
});

export const adminProcessPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(
  z.object({ id: z.number().int(), approve: z.boolean(), note: z.string().max(300) }),
))
  .handler(async ({ data, context }) => {
  const { db, log } = await gate(context);
  if (data.approve) {
    const { error } = await db.rpc("approve_payment", { _payment: data.id, _note: data.note });
    if (error) throw new Error(error.message);
  } else {
    await db
      .from("payments")
      .update({ status: "rejected", admin_note: data.note, processed_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("status", "pending");
  }
  await log(data.approve ? "payment_approve" : "payment_reject", data);
  return { ok: true };
});

/* ---------------- Tickets ---------------- */
export const adminTickets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(none))
  .handler(async ({ context }) => {
  const { db } = await gate(context);
  const { data } = await db.from("tickets").select("*").order("updated_at", { ascending: false }).limit(300);
  const ids = [...new Set((data ?? []).map((r) => r.user_id))];
  const { data: profs } = await db.from("profiles").select("id, email").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  return (data ?? []).map((r) => ({ ...r, email: profs?.find((p) => p.id === r.user_id)?.email ?? "" }));
});

export const adminSetTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(z.object({ id: z.number().int(), status: z.enum(["open", "answered", "closed"]) })))
  .handler(
  async ({ data, context }) => {
    const { db } = await gate(context);
    await db.from("tickets").update({ status: data.status }).eq("id", data.id);
    return { ok: true };
  },
);

/* ---------------- Settings ---------------- */
export const adminSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(none))
  .handler(async ({ context }) => {
  const { db } = await gate(context);
  const { data } = await db.from("settings").select("*");
  return Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as Record<string, string>;
});

export const adminSaveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(z.record(z.string().max(60), z.string().max(4000))))
  .handler(async ({ data, context }) => {
  const { db, log } = await gate(context);
  const rows = Object.entries(data).map(([key, value]) => ({ key, value }));
  await db.from("settings").upsert(rows);
  await log("settings_save", { keys: Object.keys(data) });
  return { ok: true };
});

/* ---------------- Provider diagnostics ---------------- */
export const adminTestProviderConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(z.object({ id: z.string().uuid() })))
  .handler(async ({ data, context }) => {
    const { db } = await gate(context);
    const { data: p } = await db.from("providers").select("api_url, api_key").eq("id", data.id).single();
    if (!p) throw new Error("Provider not found");
    const checks: { name: string; ok: boolean; detail: string }[] = [];
    let url = String(p.api_url ?? "").trim();
    try {
      const u = new URL(/^https?:\/\//i.test(url) ? url : "https://" + url);
      checks.push({ name: "API URL", ok: true, detail: u.toString() + (/\/api\/v\d/i.test(u.pathname) ? "" : " (warning: path has no /api/vX — check provider docs)") });
    } catch {
      checks.push({ name: "API URL", ok: false, detail: "Not a valid URL" });
      return { checks, mappings: [] };
    }
    try {
      const b = await callProvider<{ balance: string; currency: string }>(p, "balance");
      checks.push({ name: "Credentials (balance)", ok: true, detail: `Balance ${b.balance} ${b.currency ?? ""}` });
    } catch (e: any) {
      checks.push({ name: "Credentials (balance)", ok: false, detail: e.message });
    }
    let remote: any[] = [];
    try {
      const r = await callProvider<any[]>(p, "services");
      if (!Array.isArray(r)) throw new Error("Services response is not a list");
      remote = r;
      checks.push({ name: "Services list", ok: true, detail: `${r.length} services returned` });
    } catch (e: any) {
      checks.push({ name: "Services list", ok: false, detail: e.message });
    }
    const { data: local } = await db.from("services").select("id, name, provider_service_id, min_qty, max_qty, enabled").eq("provider_id", data.id).order("id");
    const byId = new Map(remote.map((s) => [String(s.service), s]));
    const mappings = (local ?? []).map((s: any) => {
      const r = byId.get(String(s.provider_service_id ?? "").trim());
      let issue = "";
      if (!s.provider_service_id) issue = "No provider service ID";
      else if (remote.length && !r) issue = "ID not found at provider";
      else if (r && (s.min_qty < Number(r.min) || s.max_qty > Number(r.max))) issue = `Qty range ${s.min_qty}-${s.max_qty} outside provider ${r.min}-${r.max}`;
      return { id: s.id, name: s.name, provider_service_id: s.provider_service_id, provider_name: r?.name ?? null, enabled: s.enabled, issue };
    });
    return { checks, mappings };
  });

export const adminExplainProviderError = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(v(z.object({ error: z.string().trim().min(3).max(8000), context: z.string().max(2000).optional() })))
  .handler(async ({ data, context }) => {
    await gate(context);
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured (missing LOVABLE_API_KEY)");
    const prompt = `You help the admin of an SMM reseller panel debug its upstream SMM provider (standard API v2: POST form fields key, action=add|status|balance|services, service, link, quantity).
Explain the most likely cause of this provider error and give concise numbered troubleshooting steps. Do not ask for API keys. Keep it under 250 words.

Provider error / response:
${data.error}
${data.context ? `\nExtra context:\n${data.context}` : ""}`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({ model: "openai/gpt-6-astra", input: prompt, stream: true, store: false, reasoning: { effort: "low" } }),
    });
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => "");
      let msg = t;
      try { msg = JSON.parse(t)?.error?.message ?? JSON.parse(t)?.message ?? t; } catch {}
      throw new Error(`AI request failed [${res.status}]: ${String(msg).slice(0, 300)}`);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", out = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") out += ev.delta ?? "";
          else if (ev.type === "error" || ev.type === "response.failed") throw new Error(ev.error?.message ?? ev.response?.error?.message ?? "AI error");
        } catch (e: any) {
          if (e?.message && !(e instanceof SyntaxError)) throw e;
        }
      }
    }
    if (!out.trim()) throw new Error("AI returned no answer");
    return { answer: out.trim() };
  });
