"use client";

export const dynamic = 'force-dynamic';

import { useMemo, useState, useEffect } from "react";
import { Card, CardBody, CardHeader, StatCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Receipt, TrendingUp, Calendar, ShoppingCart, ArrowUpRight, Loader2, PieChart, Wallet } from "lucide-react";
import Link from "next/link";
import { useReceipts } from "@/hooks/useReceipts";
import { useBudget } from "@/hooks/useBudgets";
import { createClient } from "@/lib/supabase/client";

type ChartPeriod = "monthly" | "yearly";

// Category colors for the donut chart
const CATEGORY_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
];

interface ItemCategory {
  name: string;
  amount: number;
  color: string;
}

export default function DashboardPage() {
  const { receipts, allReceipts, loading, error, stats } = useReceipts({ limit: 5 });
  const { stats: budgetStats, loading: budgetLoading } = useBudget();
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("monthly");
  const [itemCategories, setItemCategories] = useState<ItemCategory[]>([]);
  const [itemCategoriesLoading, setItemCategoriesLoading] = useState(true);

  // Fetch item-level categories from receipt_items
  useEffect(() => {
    async function fetchItemCategories() {
      setItemCategoriesLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("receipt_items")
        .select(`
          total_price,
          category:categories(id, name, color)
        `);

      if (error) {
        console.error("Error fetching item categories:", error);
        setItemCategoriesLoading(false);
        return;
      }

      // Group by category
      const categoryTotals: Record<string, ItemCategory> = {};

      data?.forEach((item) => {
        // Supabase returns joined data - category can be object or array
        const category = Array.isArray(item.category) ? item.category[0] : item.category;
        const categoryName = category?.name || "Ukategorisert";
        const categoryColor = category?.color || "#6b7280";

        if (!categoryTotals[categoryName]) {
          categoryTotals[categoryName] = {
            name: categoryName,
            amount: 0,
            color: categoryColor,
          };
        }
        categoryTotals[categoryName].amount += Number(item.total_price) || 0;
      });

      // Sort by amount and take top 6
      const sorted = Object.values(categoryTotals)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6);

      setItemCategories(sorted);
      setItemCategoriesLoading(false);
    }

    fetchItemCategories();
  }, [allReceipts]); // Refetch when receipts change

  // Calculate monthly expenses data for chart
  const monthlyData = useMemo(() => {
    if (!allReceipts.length) return [];

    const monthTotals: Record<string, number> = {};
    const now = new Date();
    const currentYear = now.getFullYear();

    // Initialize all 12 months with 0
    for (let i = 0; i < 12; i++) {
      const monthKey = `${currentYear}-${String(i + 1).padStart(2, "0")}`;
      monthTotals[monthKey] = 0;
    }

    // Sum up receipts by month
    allReceipts.forEach((receipt) => {
      const date = new Date(receipt.receipt_date);
      if (date.getFullYear() === currentYear) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthTotals[monthKey] = (monthTotals[monthKey] || 0) + Number(receipt.total_amount);
      }
    });

    // Convert to array with month names
    return Object.entries(monthTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, amount]) => {
        const [year, month] = key.split("-");
        const date = new Date(Number(year), Number(month) - 1);
        return {
          key,
          month: date.toLocaleDateString("no-NO", { month: "short" }).slice(0, 3),
          amount,
        };
      });
  }, [allReceipts]);

  // Calculate yearly expenses data
  const yearlyData = useMemo(() => {
    if (!allReceipts.length) return [];

    const yearTotals: Record<number, number> = {};

    allReceipts.forEach((receipt) => {
      const year = new Date(receipt.receipt_date).getFullYear();
      yearTotals[year] = (yearTotals[year] || 0) + Number(receipt.total_amount);
    });

    return Object.entries(yearTotals)
      .sort(([a], [b]) => Number(a) - Number(b))
      .slice(-5) // Last 5 years
      .map(([year, amount]) => ({
        key: year,
        month: year,
        amount,
      }));
  }, [allReceipts]);

  // Calculate category breakdown with percentages
  const categoryBreakdown = useMemo(() => {
    if (!itemCategories.length) return [];

    const totalAmount = itemCategories.reduce((sum, c) => sum + c.amount, 0);

    return itemCategories.map((cat, index) => ({
      ...cat,
      color: cat.color || CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      percentage: totalAmount > 0 ? Math.round((cat.amount / totalAmount) * 100) : 0,
    }));
  }, [itemCategories]);

  // Total expenses from items
  const totalItemExpenses = useMemo(() => {
    return itemCategories.reduce((sum, c) => sum + c.amount, 0);
  }, [itemCategories]);

  // Chart data based on period
  const chartData = chartPeriod === "monthly" ? monthlyData : yearlyData;
  const maxChartValue = useMemo(() => {
    if (!chartData.length) return 1000;
    return Math.max(...chartData.map((d) => d.amount)) * 1.2 || 1000;
  }, [chartData]);

  // Calculate cumulative line data (running total through the year)
  const cumulativeData = useMemo(() => {
    if (chartPeriod !== "monthly") return [];
    let cumulative = 0;
    return monthlyData.map((d) => {
      cumulative += d.amount;
      return cumulative;
    });
  }, [monthlyData, chartPeriod]);

  const maxCumulativeValue = useMemo(() => {
    if (!cumulativeData.length) return 1000;
    return Math.max(...cumulativeData) * 1.1 || 1000;
  }, [cumulativeData]);

  // Find top category from items
  const topCategory = categoryBreakdown[0]?.name || "Ingen";
  const topCategoryPercentage = categoryBreakdown[0]?.percentage || 0;

  // Calculate donut chart segments
  const donutSegments = useMemo(() => {
    let currentAngle = -90; // Start from top
    return categoryBreakdown.map((cat) => {
      const angle = (cat.percentage / 100) * 360;
      const segment = {
        ...cat,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
      };
      currentAngle += angle;
      return segment;
    });
  }, [categoryBreakdown]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
        <p className="text-[var(--accent-danger)]">Feil ved lasting av data: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8 pb-24">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] lg:text-3xl">
          Oversikt
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Spor dagligvareforbruket ditt
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Denne uken"
          value={formatCurrency(stats.totalThisWeek)}
          change="Inneværende uke"
          changeType="neutral"
          icon={<Calendar className="h-5 w-5 text-[var(--accent-primary)]" />}
        />
        <StatCard
          title="Denne måneden"
          value={formatCurrency(stats.totalThisMonth)}
          change="Inneværende måned"
          changeType="neutral"
          icon={<TrendingUp className="h-5 w-5 text-[var(--accent-primary)]" />}
        />
        <StatCard
          title="Antall kvitteringer"
          value={stats.receiptCount}
          change="Totalt"
          changeType="neutral"
          icon={<Receipt className="h-5 w-5 text-[var(--accent-primary)]" />}
        />
        <StatCard
          title="Toppkategori"
          value={topCategory}
          change={topCategoryPercentage > 0 ? `${topCategoryPercentage}% av forbruket` : "Ingen data"}
          changeType="neutral"
          icon={<ShoppingCart className="h-5 w-5 text-[var(--accent-primary)]" />}
        />
      </div>

      {/* Charts Section */}
      {allReceipts.length > 0 && (
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          {/* Monthly/Yearly Expenses Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between min-h-[28px]">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[var(--accent-primary)]" />
                  <h2 className="font-semibold text-[var(--text-primary)]">Utgifter</h2>
                </div>
                <div className="flex rounded-lg bg-[var(--bg-secondary)] p-0.5">
                  <button
                    onClick={() => setChartPeriod("monthly")}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                      chartPeriod === "monthly"
                        ? "bg-[var(--accent-primary)] text-white"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    Måned
                  </button>
                  <button
                    onClick={() => setChartPeriod("yearly")}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                      chartPeriod === "yearly"
                        ? "bg-[var(--accent-primary)] text-white"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    År
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="relative h-48 lg:h-56">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] text-[var(--text-muted)] w-10">
                  <span>{formatCurrency(maxChartValue).replace(",00", "").replace(" kr", "")}</span>
                  <span>{formatCurrency(maxChartValue / 2).replace(",00", "").replace(" kr", "")}</span>
                  <span>0</span>
                </div>

                {/* Chart area */}
                <div className="ml-12 h-full flex items-end gap-1 pb-6">
                  {chartData.map((item, index) => (
                    <div key={item.key} className="flex flex-1 flex-col items-center gap-1 relative h-full">
                      {/* Cumulative line point (only for monthly) */}
                      {chartPeriod === "monthly" && cumulativeData[index] > 0 && (
                        <div
                          className="absolute w-2 h-2 rounded-full bg-[var(--accent-primary)] z-10"
                          style={{
                            bottom: `${(cumulativeData[index] / maxCumulativeValue) * 100}%`,
                            transform: "translateX(-50%)",
                            left: "50%",
                          }}
                        />
                      )}

                      {/* Bar */}
                      <div className="flex-1 w-full flex items-end justify-center">
                        <div
                          className="w-full max-w-6 rounded-t transition-all duration-300 bg-[var(--accent-primary)]/40 hover:bg-[var(--accent-primary)]"
                          style={{
                            height: item.amount > 0 ? `${Math.max((item.amount / maxChartValue) * 100, 2)}%` : "2px",
                          }}
                        />
                      </div>

                      {/* Month label */}
                      <span className="text-[9px] lg:text-[10px] text-[var(--text-muted)] capitalize">
                        {item.month}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Cumulative line (SVG overlay for monthly) */}
                {chartPeriod === "monthly" && cumulativeData.some((v) => v > 0) && (
                  <svg
                    className="absolute inset-0 ml-12 mb-6 pointer-events-none"
                    style={{ height: "calc(100% - 24px)" }}
                    preserveAspectRatio="none"
                  >
                    <polyline
                      fill="none"
                      stroke="var(--accent-primary)"
                      strokeWidth="2"
                      points={cumulativeData
                        .map((value, index) => {
                          const x = ((index + 0.5) / cumulativeData.length) * 100;
                          const y = 100 - (value / maxCumulativeValue) * 100;
                          return `${x}%,${y}%`;
                        })
                        .join(" ")}
                    />
                  </svg>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Budget Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between min-h-[28px]">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-[var(--accent-primary)]" />
                  <h2 className="font-semibold text-[var(--text-primary)]">Budsjett</h2>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {budgetLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-primary)]" />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Income */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">Inntekter</span>
                    <span className="font-medium text-[var(--accent-success)]">
                      {formatCurrency(budgetStats.totalIncome)}
                    </span>
                  </div>

                  {/* Fixed Expenses */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">Faste utgifter</span>
                    <span className="font-medium text-[var(--text-primary)]">
                      -{formatCurrency(budgetStats.totalFixedExpenses)}
                    </span>
                  </div>

                  {/* Variable Expenses */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">Variable utgifter</span>
                    <span className="font-medium text-[var(--text-primary)]">
                      -{formatCurrency(budgetStats.totalVariableExpenses)}
                    </span>
                  </div>

                  {/* Loans */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">Lån</span>
                    <span className="font-medium text-[var(--text-primary)]">
                      -{formatCurrency(budgetStats.totalLoans)}
                    </span>
                  </div>

                  {/* Balance */}
                  <div className="mt-4 pt-3 border-t border-[var(--border-primary)]">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--text-secondary)]">Balanse</span>
                      <span className={`text-lg font-bold ${
                        budgetStats.balance >= 0
                          ? "text-[var(--accent-success)]"
                          : "text-[var(--accent-danger)]"
                      }`}>
                        {formatCurrency(budgetStats.balance)}
                      </span>
                    </div>

                    {/* Progress bar */}
                    {budgetStats.totalIncome > 0 && (
                      <div className="mt-3">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              budgetStats.balance >= 0
                                ? "bg-[var(--accent-success)]"
                                : "bg-[var(--accent-danger)]"
                            }`}
                            style={{
                              width: `${Math.min(
                                ((budgetStats.totalIncome - (budgetStats.totalFixedExpenses + budgetStats.totalVariableExpenses + budgetStats.totalLoans)) / budgetStats.totalIncome) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {Math.round((budgetStats.balance / budgetStats.totalIncome) * 100)}% av inntekt gjenstår
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Link to budget page */}
                  <Link
                    href="/budget"
                    className="flex items-center justify-center gap-1 mt-3 text-sm text-[var(--accent-primary)] transition-colors hover:text-[var(--accent-primary)]/80"
                  >
                    Se detaljer
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Category Breakdown Donut */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between min-h-[28px]">
                <div className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-[var(--accent-primary)]" />
                  <h2 className="font-semibold text-[var(--text-primary)]">Per kategori</h2>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {itemCategoriesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-primary)]" />
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  {/* Donut Chart */}
                  <div className="relative w-36 h-36 lg:w-40 lg:h-40 mb-4">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      {donutSegments.map((segment, index) => {
                        const radius = 40;
                        const circumference = 2 * Math.PI * radius;
                        const strokeDasharray = (segment.percentage / 100) * circumference;
                        const strokeDashoffset = donutSegments
                          .slice(0, index)
                          .reduce((acc, s) => acc - (s.percentage / 100) * circumference, 0);

                        return (
                          <circle
                            key={segment.name}
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="none"
                            stroke={segment.color}
                            strokeWidth="16"
                            strokeDasharray={`${strokeDasharray} ${circumference}`}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-500"
                          />
                        );
                      })}
                    </svg>
                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-[var(--text-primary)]">
                        {topCategoryPercentage}%
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{topCategory}</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="w-full space-y-1.5">
                    {categoryBreakdown.slice(0, 5).map((cat) => (
                      <div key={cat.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-[var(--text-secondary)] text-xs">{cat.name}</span>
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">{cat.percentage}%</span>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="mt-4 pt-3 border-t border-[var(--border-primary)] w-full flex items-center justify-between">
                    <span className="text-sm text-[var(--text-muted)]">Totalt</span>
                    <span className="font-bold text-[var(--accent-primary)]">
                      {formatCurrency(totalItemExpenses)}
                    </span>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Recent Receipts */}
      {receipts.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Ingen kvitteringer ennå"
          description="Legg til din første kvittering for å begynne å spore forbruket"
          action={{
            label: "Legg til kvittering",
            onClick: () => (window.location.href = "/add"),
          }}
        />
      ) : (
        <Card>
          <div className="flex items-center justify-between border-b border-[var(--border-primary)] p-4">
            <h2 className="font-semibold text-[var(--text-primary)]">
              Siste kvitteringer
            </h2>
            <Link
              href="/receipts"
              className="flex items-center gap-1 text-sm text-[var(--accent-primary)] transition-colors hover:text-[var(--accent-primary)]/80"
            >
              Se alle
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--border-primary)]">
            {receipts.map((receipt) => (
              <Link
                key={receipt.id}
                href={`/receipts/${receipt.id}`}
                className="flex items-center justify-between p-3 transition-colors hover:bg-[var(--bg-card-hover)] lg:p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10">
                    <Receipt className="h-5 w-5 text-[var(--accent-primary)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      {receipt.merchant}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {formatDate(receipt.receipt_date)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[var(--text-primary)]">
                    {formatCurrency(Number(receipt.total_amount))}
                  </p>
                  <p className="text-xs text-[var(--accent-primary)]">
                    {receipt.category?.name || "Ukategorisert"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
