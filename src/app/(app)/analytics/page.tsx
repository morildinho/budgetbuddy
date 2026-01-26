"use client";

import { useMemo } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { BarChart3, TrendingUp, PieChart, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useReceipts } from "@/hooks/useReceipts";
import { useCategories } from "@/hooks/useCategories";

export default function AnalyticsPage() {
  const { receipts, loading } = useReceipts();
  const { categories } = useCategories();

  // Calculate monthly spending data
  const monthlyData = useMemo(() => {
    if (!receipts.length) return [];

    const monthTotals: Record<string, number> = {};

    receipts.forEach((receipt) => {
      const date = new Date(receipt.receipt_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthTotals[monthKey]) {
        monthTotals[monthKey] = 0;
      }
      monthTotals[monthKey] += Number(receipt.total_amount);
    });

    // Sort by date and get last 4 months
    return Object.entries(monthTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-4)
      .map(([key, amount]) => {
        const [year, month] = key.split('-');
        const date = new Date(Number(year), Number(month) - 1);
        return {
          key, // unique key like "2026-01"
          month: date.toLocaleDateString('no-NO', { month: 'short' }),
          amount,
        };
      });
  }, [receipts]);

  // Calculate category breakdown
  const categoryBreakdown = useMemo(() => {
    if (!receipts.length) return [];

    const categoryTotals: Record<string, number> = {};

    receipts.forEach((receipt) => {
      const categoryId = receipt.category_id || 'uncategorized';
      if (!categoryTotals[categoryId]) {
        categoryTotals[categoryId] = 0;
      }
      categoryTotals[categoryId] += Number(receipt.total_amount);
    });

    const totalAmount = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    return Object.entries(categoryTotals)
      .map(([categoryId, amount]) => {
        const category = categories.find((c) => c.id === categoryId);
        return {
          category: category?.name || 'Ukategorisert',
          amount,
          percentage: Math.round((amount / totalAmount) * 100),
          color: category?.color || 'var(--text-muted)',
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // Top 5 categories
  }, [receipts, categories]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!receipts.length) {
      return {
        averagePerWeek: 0,
        mostExpensive: 0,
        totalThisYear: 0,
        topMerchant: '-',
      };
    }

    const currentYear = new Date().getFullYear();
    const totalThisYear = receipts
      .filter((r) => new Date(r.receipt_date).getFullYear() === currentYear)
      .reduce((sum, r) => sum + Number(r.total_amount), 0);

    // Calculate weeks in data range
    const dates = receipts.map((r) => new Date(r.receipt_date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const weeks = Math.max(1, Math.ceil((maxDate - minDate) / (7 * 24 * 60 * 60 * 1000)));
    const totalAmount = receipts.reduce((sum, r) => sum + Number(r.total_amount), 0);
    const averagePerWeek = totalAmount / weeks;

    const mostExpensive = Math.max(...receipts.map((r) => Number(r.total_amount)));

    // Find top merchant
    const merchantCounts: Record<string, number> = {};
    receipts.forEach((r) => {
      merchantCounts[r.merchant] = (merchantCounts[r.merchant] || 0) + 1;
    });
    const topMerchant = Object.entries(merchantCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || '-';

    return {
      averagePerWeek,
      mostExpensive,
      totalThisYear,
      topMerchant,
    };
  }, [receipts]);

  // Find max amount for chart scaling
  const maxAmount = useMemo(() => {
    if (!monthlyData.length) return 1000;
    return Math.max(...monthlyData.map((d) => d.amount)) * 1.2;
  }, [monthlyData]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] lg:text-3xl">Analyse</h1>
          <p className="text-sm text-[var(--text-muted)]">Dine forbruksinnsikter</p>
        </div>
        <Button variant="outline" className="hidden lg:flex">
          <Download className="h-4 w-4" />
          Eksporter
        </Button>
      </div>

      {receipts.length === 0 ? (
        <Card>
          <CardBody className="p-8 text-center">
            <p className="text-[var(--text-muted)]">
              Ingen kvitteringer ennå. Legg til noen kvitteringer for å se analyser.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[var(--accent-primary)]" />
                <h2 className="font-semibold text-[var(--text-primary)]">Månedlig forbruk</h2>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex items-end justify-between gap-3 h-48">
                {monthlyData.map((item) => (
                  <div key={item.key} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t transition-all duration-300 hover:opacity-80"
                      style={{
                        height: `${(item.amount / maxAmount) * 100}%`,
                        minHeight: "20px",
                        background: "linear-gradient(180deg, var(--accent-primary) 0%, var(--accent-primary)/50 100%)",
                      }}
                    />
                    <span className="text-xs text-[var(--text-muted)]">{item.month}</span>
                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-[var(--accent-primary)]" />
                <h2 className="font-semibold text-[var(--text-primary)]">Per kategori</h2>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {categoryBreakdown.map((item) => (
                  <div key={item.category}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[var(--text-secondary)]">{item.category}</span>
                      </div>
                      <span className="font-medium text-[var(--text-primary)]">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Summary Stats */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[var(--accent-primary)]" />
                <h2 className="font-semibold text-[var(--text-primary)]">Oppsummering</h2>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Gjennomsnitt per uke</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
                    {formatCurrency(summaryStats.averagePerWeek)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Dyreste kvittering</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
                    {formatCurrency(summaryStats.mostExpensive)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Totalt i år</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
                    {formatCurrency(summaryStats.totalThisYear)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Toppbutikk</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--accent-primary)]">
                    {summaryStats.topMerchant}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
