import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Languages, LogOut, Menu, X, Wallet, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { Logo } from "./Logo";
import { money } from "./ui";

export type NavItem = { to: string; label: TKey; icon: LucideIcon };

export function AppShell({ nav, children, admin }: { nav: NavItem[]; children: ReactNode; admin?: boolean }) {
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [{ data: w }, { data: isAdmin }, { data: p }] = await Promise.all([
        supabase.from("wallets").select("balance").eq("user_id", u.user.id).maybeSingle(),
        supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" }),
        supabase.from("profiles").select("display_name, email").eq("id", u.user.id).maybeSingle(),
      ]);
      return { balance: Number(w?.balance ?? 0), isAdmin: !!isAdmin, name: p?.display_name ?? u.user.email };
    },
  });

  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="mb-6 flex items-center justify-between px-2">
        <Logo to={admin ? "/admin" : "/dashboard"} />
        <button className="lg:hidden text-muted-foreground" onClick={() => setOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      {admin && (
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">{t("adminPanel")}</div>
      )}
      {nav.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          onClick={() => setOpen(false)}
          activeOptions={{ exact: n.to === "/admin" }}
          className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground shadow-glow" }}
        >
          <n.icon className="h-4 w-4 opacity-80 group-hover:text-primary" />
          {t(n.label)}
        </Link>
      ))}
      <div className="mt-auto space-y-1 border-t border-sidebar-border pt-4">
        {me?.isAdmin && (
          <Link
            to={admin ? "/dashboard" : "/admin"}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-primary hover:bg-sidebar-accent"
          >
            {admin ? t("customerPanel") : t("adminPanel")}
          </Link>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4" /> {t("logout")}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 border-e border-sidebar-border bg-sidebar lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 border-e border-sidebar-border bg-sidebar">{sidebar}</aside>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="lg:hidden"><Logo /></div>
          <div className="ms-auto flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:border-primary"
            >
              <Languages className="h-3.5 w-3.5" /> {lang === "en" ? "العربية" : "English"}
            </button>
            <Link
              to="/add-funds"
              className="flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"
            >
              <Wallet className="h-4 w-4" /> {money(me?.balance ?? 0, 2)}
            </Link>
            <span className="hidden text-sm text-muted-foreground md:inline">{me?.name}</span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
