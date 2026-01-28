"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, Receipt, BarChart3, Settings, Wallet, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: Home, label: "Oversikt" },
  { href: "/receipts", icon: Receipt, label: "Kvitteringer" },
  { href: "/analytics", icon: BarChart3, label: "Analyse" },
  { href: "/budget", icon: Wallet, label: "Budsjett" },
  { href: "/settings", icon: Settings, label: "Innstillinger" },
  { href: "/help", icon: HelpCircle, label: "Hjelp" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-[var(--border-primary)] bg-[var(--bg-secondary)] lg:block">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-[var(--border-primary)] px-6">
          <Image
            src="/logo.webp"
            alt="Budgetbuddy"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <span className="text-lg font-semibold text-[var(--text-primary)]">
            Budgetbuddy
          </span>
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
          <div className="rounded-lg bg-[var(--bg-card)] p-4">
            <p className="text-xs text-[var(--text-muted)]">Spor forbruket ditt</p>
            <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
              Hold budsjettet
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
