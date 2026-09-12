"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  HelpCircle,
  Home,
  Landmark,
  LogOut,
  Receipt,
  Settings,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { ThemeToggle } from "./ThemeToggle";
import { BrandLogo } from "./BrandLogo";

const allNavItems = [
  { href: "/", icon: Home, label: "Oversikt", permKey: "overview", ownerOnly: false, group: "main" },
  { href: "/receipts", icon: Receipt, label: "Kvitteringer", permKey: "receipts", ownerOnly: false, group: "main" },
  { href: "/transactions", icon: Landmark, label: "Transaksjoner", permKey: "transactions", ownerOnly: false, group: "main" },
  { href: "/bank", icon: Building2, label: "Bank", permKey: "transactions", ownerOnly: true, group: "main" },
  { href: "/analytics", icon: BarChart3, label: "Analyse", permKey: "analytics", ownerOnly: false, group: "main" },
  { href: "/budget", icon: Wallet, label: "Budsjett", permKey: "budget", ownerOnly: false, group: "main" },
  { href: "/portfolio", icon: TrendingUp, label: "Portefølje", permKey: "portfolio", ownerOnly: false, group: "main" },
  { href: "/settings", icon: Settings, label: "Innstillinger", permKey: null, ownerOnly: false, group: "system" },
  { href: "/help", icon: HelpCircle, label: "Hjelp", permKey: null, ownerOnly: false, group: "system" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { canView, isOwner, loading: permLoading } = usePermissions();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navItems = allNavItems.filter((item) => {
    if (item.ownerOnly && !isOwner) return false;
    if (!item.permKey) return true;
    if (isOwner) return true;
    if (permLoading) return false;
    return canView[item.permKey as keyof typeof canView] === true;
  });

  const renderItems = (group: "main" | "system") =>
    navItems
      .filter((item) => item.group === group)
      .map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              isActive
                ? "bg-[var(--accent-primary)]/10 font-semibold text-[var(--accent-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                isActive
                  ? "bg-[var(--accent-primary)]/10"
                  : "bg-transparent group-hover:bg-[var(--bg-secondary)]"
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.4 : 1.9} />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      });

  return (
    <aside className="sidebar-surface fixed left-0 top-0 z-40 hidden h-screen w-64 overflow-y-auto border-r border-[var(--border-primary)] lg:block">
      <div className="flex min-h-full flex-col px-4 py-5">
        <div className="mb-7 border-b border-[var(--border-primary)] px-2 pb-5">
          <BrandLogo />
        </div>

        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Økonomi
        </div>
        <nav aria-label="Økonomi" className="space-y-1">{renderItems("main")}</nav>

        <div className="mt-auto space-y-4 pt-6">
          <div>
            <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              System
            </div>
            <nav aria-label="System" className="space-y-1">{renderItems("system")}</nav>
          </div>

          <ThemeToggle />

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg">
              <LogOut className="h-[18px] w-[18px]" />
            </span>
            <span>Logg ut</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
