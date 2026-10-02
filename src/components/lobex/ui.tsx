import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-rise">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ children, className, glow }: { children: ReactNode; className?: string; glow?: boolean }) {
  return <div className={cn("panel p-5 animate-rise", glow && "panel-glow", className)}>{children}</div>;
}

export function Stat({ label, value, icon, accent }: { label: string; value: ReactNode; icon: ReactNode; accent?: boolean }) {
  return (
    <div className={cn("panel flex items-center gap-4 p-5 animate-rise", accent && "panel-glow")}>
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate font-display text-xl font-semibold">{value}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string | undefined }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

const statusTone: Record<string, string> = {
  completed: "bg-success/15 text-success",
  approved: "bg-success/15 text-success",
  answered: "bg-success/15 text-success",
  in_progress: "bg-info/15 text-info",
  processing: "bg-info/15 text-info",
  pending: "bg-warning/15 text-warning",
  open: "bg-warning/15 text-warning",
  partial: "bg-warning/15 text-warning",
  canceled: "bg-destructive/15 text-destructive",
  failed: "bg-destructive/15 text-destructive",
  rejected: "bg-destructive/15 text-destructive",
  closed: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", statusTone[status] ?? "bg-muted text-muted-foreground")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function DataTable({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="panel overflow-hidden animate-rise">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-2/60 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              {head.map((h, i) => (
                <th key={i} className="whitespace-nowrap px-4 py-3 text-start font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">{children}</tbody>
        </table>
      </div>
      {empty && <div className="px-4 py-10 text-center text-sm text-muted-foreground">No records found.</div>}
    </div>
  );
}

export const td = "px-4 py-3 align-middle";

export const money = (n: number | string | null | undefined, digits = 4) =>
  "$" + Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: digits });

export const fdate = (s: string) => new Date(s).toLocaleString();
