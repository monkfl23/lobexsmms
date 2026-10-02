<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Balance changes only via SECURITY DEFINER SQL functions (place_order_debit, refund_order, adjust_balance, approve_payment) executable by service_role — keeps money ops atomic and out of client reach.
- Provider API calls live only in src/lib/*.server.ts and admin server fns; provider keys never reach the browser.
- Customer-facing service lists come from server fns that project safe columns; the services/providers tables have no client RLS policies.
- Admin server fns check has_role via the user's client before loading the admin client.
- Public reseller API is src/routes/api/public/v2.ts, authenticated by per-user api_keys.
- Write every server fn as one inline createServerFn().middleware().inputValidator().handler() chain; no factory helpers — the compiler only extracts literal chains, otherwise handlers run in the browser without server context.
