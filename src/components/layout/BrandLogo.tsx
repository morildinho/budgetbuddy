import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)} aria-label="BudgetBuddy">
      <div className="relative h-12 w-14 shrink-0 overflow-hidden" aria-hidden="true">
        <Image
          src="/logo.png"
          alt=""
          width={1828}
          height={548}
          className="absolute left-0 top-1/2 h-12 w-auto max-w-none -translate-y-1/2"
          priority
        />
      </div>
      {!compact && (
        <span className="text-xl font-extrabold tracking-[-0.04em] text-[var(--text-primary)]">
          Budget<span className="font-semibold text-[var(--accent-primary)]">Buddy</span>
        </span>
      )}
    </div>
  );
}
