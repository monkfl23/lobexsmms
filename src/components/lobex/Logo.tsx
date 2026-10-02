import { Link } from "@tanstack/react-router";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5">
      <span className="brand-mark grid h-8 w-8 place-items-center rounded-lg font-display text-sm font-bold text-primary-foreground">L</span>
      <span className="font-display text-lg font-bold tracking-tight">
        LOBEX <span className="text-primary text-glow">SMM</span>
      </span>
    </Link>
  );
}
