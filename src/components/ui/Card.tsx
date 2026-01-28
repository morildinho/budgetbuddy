import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = true }: CardProps) {
  return (
    <div
      className={cn(
        "glass-card rounded-xl transition-all duration-300",
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
        "border-b border-[var(--border-primary)] px-6 py-4",
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
  return <div className={cn("p-6", className)}>{children}</div>;
}

// Stat card component for dashboard
interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
}

export function StatCard({ title, value, change, changeType = "neutral", icon }: StatCardProps) {
  const changeColors = {
    positive: "text-[var(--accent-success)]",
    negative: "text-[var(--accent-danger)]",
    neutral: "text-[var(--text-muted)]",
  };

  return (
    <Card className="p-4 overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[var(--text-muted)] truncate">{title}</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)] truncate">{value}</p>
          {change && (
            <p className={cn("mt-1 text-sm truncate", changeColors[changeType])}>
              {changeType === "positive" && "↗ "}
              {changeType === "negative" && "↘ "}
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10 overflow-hidden">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
