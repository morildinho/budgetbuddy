import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    default: "bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-primary)]",
    primary: "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]",
    success: "bg-[var(--accent-success)]/20 text-[var(--accent-success)]",
    warning: "bg-[var(--accent-warning)]/20 text-[var(--accent-warning)]",
    danger: "bg-[var(--accent-danger)]/20 text-[var(--accent-danger)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
