import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listServices } from "@/lib/customer.functions";
import { useI18n } from "@/lib/i18n";
import { DataTable, PageHeader, money, td } from "@/components/lobex/ui";

export const Route = createFileRoute("/_authenticated/_customer/services")({
  head: () => ({ meta: [{ title: "Services — LOBEX SMM" }] }),
  component: Services,
});

function Services() {
  const { t } = useI18n();
  const fetchServices = useServerFn(listServices);
  const { data } = useQuery({ queryKey: ["catalog"], queryFn: () => fetchServices() });
  const [q, setQ] = useState("");
  const filtered = (data?.services ?? []).filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()) || String(s.id) === q);

  return (
    <>
      <PageHeader title={t("services")} actions={<input className="field w-64" placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />} />
      {(data?.categories ?? []).map((c) => {
        const rows = filtered.filter((s) => s.category_id === c.id);
        if (!rows.length) return null;
        return (
          <div key={c.id} className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">{c.name}</h2>
            <DataTable head={["ID", t("service"), t("rate"), "Min", "Max", ""]}>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className={td + " font-mono text-primary"}>{s.id}</td>
                  <td className={td}>{s.name}</td>
                  <td className={td}>{money(s.rate)}</td>
                  <td className={td}>{s.min_qty.toLocaleString()}</td>
                  <td className={td}>{s.max_qty.toLocaleString()}</td>
                  <td className={td}>
                    <Link to="/new-order" search={{ service: s.id }} className="text-sm font-medium text-primary hover:underline">{t("newOrder")}</Link>
                  </td>
                </tr>
              ))}
            </DataTable>
          </div>
        );
      })}
      {data && !filtered.length && <p className="text-sm text-muted-foreground">No services available.</p>}
    </>
  );
}
