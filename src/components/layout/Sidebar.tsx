"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Home, Receipt, BarChart3, Settings, Wallet, HelpCircle, LogOut, Landmark, TrendingUp, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";

const allNavItems = [
  { href: "/", icon: Home, label: "Oversikt", permKey: "overview", ownerOnly: false },
  { href: "/receipts", icon: Receipt, label: "Kvitteringer", permKey: "receipts", ownerOnly: false },
  { href: "/transactions", icon: Landmark, label: "Transaksjoner", permKey: "transactions", ownerOnly: false },
  { href: "/bank", icon: Building2, label: "Bank", permKey: "transactions", ownerOnly: true },
  { href: "/analytics", icon: BarChart3, label: "Analyse", permKey: "analytics", ownerOnly: false },
  { href: "/budget", icon: Wallet, label: "Budsjett", permKey: "budget", ownerOnly: false },
  { href: "/portfolio", icon: TrendingUp, label: "Portefølje", permKey: "portfolio", ownerOnly: false },
  { href: "/settings", icon: Settings, label: "Innstillinger", permKey: null, ownerOnly: false },
  { href: "/help", icon: HelpCircle, label: "Hjelp", permKey: null, ownerOnly: false },
];

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
    if (!item.permKey) return true; // always show (settings, help)
    if (isOwner) return true; // owners see everything
    if (permLoading) return false; // fail closed while permissions load
    return canView[item.permKey as keyof typeof canView] === true;
  });

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-[var(--border-primary)] bg-[var(--bg-secondary)] lg:block">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="border-b border-[var(--border-primary)] px-4 py-4">
          <div className="relative h-16 w-full">
            <Image
              src="/logo.png"
              alt="Budgetbuddy"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                  isActive
                    ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn(isActive && "font-medium")}>{item.label}</span>
                {isActive && (
                  <div className="ml-auto h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-[var(--border-primary)] p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--text-secondary)] transition-all duration-200 hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
          >
            <LogOut className="h-5 w-5" />
            <span>Logg ut</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
