import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import {
  ArrowLeftRight, CreditCard, FolderTree, KeyRound, LayoutDashboard, LifeBuoy, ListChecks, Server, Settings, ShoppingBag, Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, type NavItem } from "@/components/lobex/AppShell";

const nav: NavItem[] = [
  { to: "/admin", label: "dashboard", icon: LayoutDashboard },
  { to: "/admin/users", label: "users", icon: Users },
  { to: "/admin/providers", label: "providers", icon: Server },
  { to: "/admin/services", label: "services", icon: ListChecks },
  { to: "/admin/categories", label: "categories", icon: FolderTree },
  { to: "/admin/orders", label: "orders", icon: ShoppingBag },
  { to: "/admin/transactions", label: "transactions", icon: ArrowLeftRight },
  { to: "/admin/payments", label: "payments", icon: CreditCard },
  { to: "/admin/tickets", label: "tickets", icon: LifeBuoy },
  { to: "/admin/api-settings", label: "apiSettings", icon: KeyRound },
  { to: "/admin/settings", label: "settings", icon: Settings },
];

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("has_role", { _user_id: (context as any).user.id, _role: "admin" });
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: () => (
    <AppShell nav={nav} admin>
      <Outlet />
    </AppShell>
  ),
});
