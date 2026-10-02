import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/lobex/ui";
import { SettingsForm } from "@/components/lobex/SettingsForm";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — LOBEX SMM Admin" }] }),
  component: () => (
    <>
      <PageHeader title="Settings" />
      <SettingsForm
        fields={[
          { key: "site_name", label: "Site name" },
          { key: "currency", label: "Currency code" },
          { key: "announcement", label: "Dashboard announcement", type: "textarea", hint: "Shown at the top of every customer dashboard. Leave empty to hide." },
          { key: "min_deposit", label: "Minimum deposit", type: "number" },
          { key: "payment_methods", label: "Payment methods", hint: "Comma separated, e.g. Bank Transfer, USDT (TRC20), Binance Pay" },
          { key: "payment_instructions", label: "Payment instructions", type: "textarea", hint: "Wallet addresses / bank details customers should pay to." },
        ]}
      />
    </>
  ),
});
