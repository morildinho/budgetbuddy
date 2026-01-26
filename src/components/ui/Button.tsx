"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)] disabled:pointer-events-none disabled:opacity-50";

    const variants = {
      primary:
        "bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:bg-[var(--accent-primary)]/90 focus:ring-[var(--accent-primary)] shadow-lg shadow-[var(--accent-primary)]/20",
      secondary:
        "bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-primary)] hover:border-[var(--border-secondary)] hover:bg-[var(--bg-card-hover)]",
      outline:
        "border border-[var(--border-primary)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-card)] hover:border-[var(--border-secondary)]",
      ghost:
        "text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]",
      danger:
        "bg-[var(--accent-danger)] text-white hover:bg-[var(--accent-danger)]/90 focus:ring-[var(--accent-danger)]",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseClasses, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
