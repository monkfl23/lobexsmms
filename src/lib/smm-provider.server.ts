// Standard SMM Panel API v2 client. Server-only: provider keys never leave the server.
export type ProviderCreds = { api_url: string; api_key: string };

/** Thrown when the provider definitively rejected the request (safe to refund). */
export class ProviderRejectedError extends Error {
  constructor(message: string, public status?: number, public body?: string) {
    super(message);
    this.name = "ProviderRejectedError";
  }
}
/** Thrown when we don't know whether the provider accepted the order (do NOT refund). */
export class ProviderUnknownError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderUnknownError";
  }
}

function cleanUrl(raw: string): string {
  let u = String(raw ?? "").trim();
  if (u && !/^https?:\/\//i.test(u)) u = "https://" + u;
  return u;
}

function snippet(text: string, key: string): string {
  let s = text.replace(/\s+/g, " ").trim();
  if (key) s = s.split(key).join("***");
  return s.length > 300 ? s.slice(0, 300) + "…" : s;
}

function parseBody(text: string): any {
  const t = text.replace(/^\uFEFF/, "").trim();
  try {
    return JSON.parse(t);
  } catch {
    // Some panels prepend PHP notices/HTML before the JSON payload.
    const m = t.match(/(\{[\s\S]*\}|\[[\s\S]*\])\s*$/);
    if (m) {
      try {
        return JSON.parse(m[1] ?? "");
      } catch {}
    }
    return undefined;
  }
}

export async function callProvider<T = any>(
  p: ProviderCreds,
  action: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const url = cleanUrl(p.api_url);
  const key = String(p.api_key ?? "").trim();
  if (!url) throw new ProviderRejectedError("Provider API URL is not configured");
  if (!key) throw new ProviderRejectedError("Provider API key is not configured");

  const body = new URLSearchParams({ key, action });
  for (const [k, v] of Object.entries(params)) body.set(k, String(v).trim());

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  let res: Response;
  let text: string;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json, text/plain, */*",
        // Many panels sit behind Cloudflare/WAF which return 400/403 for requests without a UA.
        "User-Agent": "Mozilla/5.0 (compatible; LobexSMM/1.0)",
      },
      body: body.toString(),
      signal: ctrl.signal,
      redirect: "follow",
    });
    text = await res.text();
  } catch (e: any) {
    throw new ProviderUnknownError(
      e?.name === "AbortError" ? "Provider timed out" : `Provider unreachable: ${e?.message ?? e}`,
    );
  } finally {
    clearTimeout(timer);
  }

  const json = parseBody(text);
  console.log(`[provider] ${action} -> HTTP ${res.status} ${snippet(text, key)}`);

  if (json && typeof json === "object" && !Array.isArray(json) && json.error) {
    throw new ProviderRejectedError(`Provider error: ${String(json.error)}`, res.status, text);
  }
  if (!res.ok) {
    throw new ProviderRejectedError(
      `Provider HTTP ${res.status}: ${snippet(text, key) || "(empty body)"}`,
      res.status,
      text,
    );
  }
  if (json === undefined) {
    // 2xx with unparseable body: provider may have accepted; caller decides.
    throw new ProviderUnknownError(`Provider returned non-JSON response (HTTP ${res.status}): ${snippet(text, key)}`);
  }
  return json as T;
}

export function normalizeStatus(s: string | undefined): string {
  const v = (s ?? "").toLowerCase().replace(/\s+/g, "_");
  if (["completed", "complete"].includes(v)) return "completed";
  if (["in_progress", "inprogress", "processing", "progress"].includes(v)) return "in_progress";
  if (v === "partial") return "partial";
  if (["canceled", "cancelled", "refunded"].includes(v)) return "canceled";
  if (v === "pending") return "pending";
  return v || "processing";
}
