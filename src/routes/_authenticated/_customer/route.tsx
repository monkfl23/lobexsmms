import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ArrowLeftRight, Code2, LayoutDashboard, LifeBuoy, ListChecks, PlusCircle, ShoppingBag, User, Wallet } from "lucide-react";
import { AppShell, type NavItem } from "@/components/lobex/AppShell";

const nav: NavItem[] = [
  { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
  { to: "/new-order", label: "newOrder", icon: PlusCircle },
  { to: "/services", label: "services", icon: ListChecks },
  { to: "/orders", label: "orders", icon: ShoppingBag },
  { to: "/add-funds", label: "addFunds", icon: Wallet },
  { to: "/transactions", label: "transactions", icon: ArrowLeftRight },
  { to: "/tickets", label: "tickets", icon: LifeBuoy },
  { to: "/api", label: "api", icon: Code2 },
  { to: "/account", label: "account", icon: User },
];

export const Route = createFileRoute("/_authenticated/_customer")({
  component: () => (
    <AppShell nav={nav}>
      <Outlet />
    </AppShell>
  ),
});
