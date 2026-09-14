import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        "glass-card rounded-2xl transition-colors duration-200",
        hover && "hover:border-[var(--border-secondary)]",
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div
      className={cn(
        "border-b border-[var(--border-primary)] px-4 py-3 lg:px-5",
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function CardBody({ children, className }: CardBodyProps) {
  return <div className={cn("p-4 lg:p-5", className)}>{children}</div>;
}

// Stat card component for dashboard
interface StatCardProps {
  title: string;
  value: string | number;
  valueClassName?: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
}

export function StatCard({ title, value, valueClassName, change, changeType = "neutral", icon }: StatCardProps) {
  const changeColors = {
    positive: "text-[var(--accent-success)]",
    negative: "text-[var(--accent-danger)]",
    neutral: "text-[var(--text-muted)]",
  };

  return (
    <Card className="overflow-hidden p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-[var(--text-muted)]">{title}</p>
          <p className={cn("mt-1.5 truncate text-2xl font-bold tracking-tight text-[var(--text-primary)]", valueClassName)}>{value}</p>
          {change && (
            <p className={cn("mt-1 truncate text-xs", changeColors[changeType])}>
              {changeType === "positive" && "↗ "}
              {changeType === "negative" && "↘ "}
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--accent-primary)]/10">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
