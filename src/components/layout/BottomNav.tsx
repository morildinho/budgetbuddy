"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Receipt, Wallet, BarChart3, Settings, Landmark, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

const allNavItems = [
  { href: "/", icon: Home, label: "Oversikt", permKey: "overview" },
  { href: "/receipts", icon: Receipt, label: "Kvitteringer", permKey: "receipts" },
  { href: "/transactions", icon: Landmark, label: "Bank", permKey: "transactions" },
  { href: "/budget", icon: Wallet, label: "Budsjett", permKey: "budget" },
  { href: "/analytics", icon: BarChart3, label: "Analyse", permKey: "analytics" },
  { href: "/portfolio", icon: TrendingUp, label: "Portefølje", permKey: "portfolio" },
  { href: "/settings", icon: Settings, label: "Innstillinger", permKey: null },
];

export function BottomNav() {
  const pathname = usePathname();
  const { canView, isOwner, loading: permLoading } = usePermissions();

  const navItems = allNavItems.filter((item) => {
    if (!item.permKey) return true;
    if (isOwner) return true;
    if (permLoading) return false;
    return canView[item.permKey as keyof typeof canView] === true;
  });

  // BottomNav shows max 6 items to avoid crowding
  const displayItems = navItems.slice(0, 6);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] pb-safe lg:hidden">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {displayItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs transition-all duration-200",
                isActive
                  ? "text-[var(--accent-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-lg p-1.5 transition-all duration-200",
                  isActive && "bg-[var(--accent-primary)]/10"
                )}
              >
                <Icon
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span className={cn(isActive && "font-medium")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
