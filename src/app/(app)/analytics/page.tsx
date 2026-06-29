"use client";

export const dynamic = 'force-dynamic';

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { BarChart3, TrendingUp, Download, Loader2, Search, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useReceipts } from "@/hooks/useReceipts";
import { useCategories } from "@/hooks/useCategories";
import { useReceiptItems } from "@/hooks/useReceiptItems";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

const MONTH_NAMES = [
  "jan", "feb", "mar", "apr", "mai", "jun",
  "jul", "aug", "sep", "okt", "nov", "des",
];

function MonthlyTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-[var(--text-primary)]">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

function PriceTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { merchant: string } }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-[var(--text-primary)]">{formatCurrency(payload[0].value)}</p>
      <p className="text-xs text-[var(--text-muted)]">{payload[0].payload.merchant}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { receipts, loading } = useReceipts();
  const { categories } = useCategories();
  const { items: receiptItems, loading: itemsLoading } = useReceiptItems();
  const [priceSearchQuery, setPriceSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // ─── Monthly spending data (last 6 months, always show all 6) ───
  const monthlyData = useMemo(() => {
    const monthTotals: Record<string, number> = {};

    receipts.forEach((receipt) => {
      const date = new Date(receipt.receipt_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthTotals[monthKey] = (monthTotals[monthKey] || 0) + Number(receipt.total_amount);
    });

    // Build last 6 months including current, even if no data
    const now = new Date();
    const months: { name: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        name: MONTH_NAMES[d.getMonth()],
        amount: Math.round(monthTotals[key] || 0),
      });
    }
    return months;
  }, [receipts]);

  // ─── Item-level category breakdown ───
  const itemCategoryBreakdown = useMemo(() => {
    if (!receiptItems.length) return [];

    const categoryTotals: Record<string, number> = {};

    receiptItems.forEach((item) => {
      const categoryId = item.category_id || "uncategorized";
      categoryTotals[categoryId] = (categoryTotals[categoryId] || 0) + Number(item.total_price);
    });

    return Object.entries(categoryTotals)
      .map(([categoryId, amount]) => {
        const category = categories.find((c) => c.id === categoryId);
        return {
          name: category?.name || "Ukategorisert",
          amount: Math.round(amount),
          color: category?.color || "#64748b",
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [receiptItems, categories]);

  // ─── Price tracking: unique item names ───
  const uniqueItemNames = useMemo(() => {
    const nameMap: Record<string, number> = {};
    receiptItems.forEach((item) => {
      const name = item.item_name.trim();
      if (name) {
        const lower = name.toLowerCase();
        nameMap[lower] = (nameMap[lower] || 0) + 1;
      }
    });
    // Sort by frequency (most common first)
    return Object.entries(nameMap)
      .sort(([, a], [, b]) => b - a)
      .map(([name]) => name);
  }, [receiptItems]);

  const filteredItemNames = useMemo(() => {
    if (!priceSearchQuery.trim()) return uniqueItemNames.slice(0, 20);
    const q = priceSearchQuery.toLowerCase();
    return uniqueItemNames.filter((name) => name.includes(q)).slice(0, 20);
  }, [uniqueItemNames, priceSearchQuery]);

  // ─── Price tracking: selected item data ───
  const priceTrackingData = useMemo(() => {
    if (!selectedItem) return { chartData: [], avgPrice: 0, count: 0 };

    const matching = receiptItems
      .filter((item) => item.item_name.toLowerCase().trim() === selectedItem)
      .filter((item) => item.receipt?.receipt_date && item.unit_price != null)
      .map((item) => ({
        date: item.receipt!.receipt_date,
        price: Number(item.unit_price),
        merchant: item.receipt!.merchant,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const chartData = matching.map((m) => {
      const d = new Date(m.date);
      return {
        name: `${d.getDate()}/${d.getMonth() + 1}`,
        pris: m.price,
        merchant: m.merchant,
      };
    });

    const avgPrice = matching.length > 0
      ? matching.reduce((sum, m) => sum + m.price, 0) / matching.length
      : 0;

    return { chartData, avgPrice, count: matching.length };
  }, [selectedItem, receiptItems]);

  // ─── Summary statistics (existing) ───
  const summaryStats = useMemo(() => {
    if (!receipts.length) {
      return { averagePerWeek: 0, mostExpensive: 0, totalThisYear: 0, topMerchant: "-" };
    }

    const currentYear = new Date().getFullYear();
    const totalThisYear = receipts
      .filter((r) => new Date(r.receipt_date).getFullYear() === currentYear)
      .reduce((sum, r) => sum + Number(r.total_amount), 0);

    const dates = receipts.map((r) => new Date(r.receipt_date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const weeks = Math.max(1, Math.ceil((maxDate - minDate) / (7 * 24 * 60 * 60 * 1000)));
    const totalAmount = receipts.reduce((sum, r) => sum + Number(r.total_amount), 0);
    const averagePerWeek = totalAmount / weeks;

    const mostExpensive = Math.max(...receipts.map((r) => Number(r.total_amount)));

    const merchantCounts: Record<string, number> = {};
    receipts.forEach((r) => {
      merchantCounts[r.merchant] = (merchantCounts[r.merchant] || 0) + 1;
    });
    const topMerchant = Object.entries(merchantCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || "-";

    return { averagePerWeek, mostExpensive, totalThisYear, topMerchant };
  }, [receipts]);

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
          {/* ─── Monthly Spending Trend (Recharts) ─── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[var(--accent-primary)]" />
                <h2 className="font-semibold text-[var(--text-primary)]">Månedlig forbruk</h2>
              </div>
            </CardHeader>
            <CardBody>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                    />
                    <Tooltip content={<MonthlyTooltip />} cursor={{ fill: "rgba(148,163,184,0.1)" }} />
                    <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-sm text-[var(--text-muted)]">Ingen data</p>
              )}
            </CardBody>
          </Card>

          {/* ─── Item-Level Category Breakdown ─── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-[var(--accent-primary)]" />
                <h2 className="font-semibold text-[var(--text-primary)]">Varekategorier</h2>
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Forbruk per kategori basert på enkeltprodukter</p>
            </CardHeader>
            <CardBody className="max-h-[340px] overflow-y-auto">
              {itemsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-primary)]" />
                </div>
              ) : itemCategoryBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {itemCategoryBreakdown.map((item) => (
                    <div key={item.name}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-[var(--text-secondary)]">{item.name}</span>
                        </div>
                        <span className="font-medium text-[var(--text-primary)]">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-primary)]">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.round((item.amount / itemCategoryBreakdown[0].amount) * 100)}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                  Ingen varedata ennå
                </p>
              )}
            </CardBody>
          </Card>

          {/* ─── Price Tracking ─── */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-[var(--accent-primary)]" />
                <h2 className="font-semibold text-[var(--text-primary)]">Prissporing</h2>
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Følg prisen på enkeltprodukter over tid</p>
            </CardHeader>
            <CardBody>
              {/* Search input */}
              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={priceSearchQuery}
                  onChange={(e) => {
                    setPriceSearchQuery(e.target.value);
                    setSelectedItem(null);
                  }}
                  placeholder="Søk etter produkt..."
                  className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] py-2 pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                />
              </div>

              {/* Item suggestions */}
              {!selectedItem && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {filteredItemNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => {
                        setSelectedItem(name);
                        setPriceSearchQuery(name);
                      }}
                      className="rounded-full border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                    >
                      {name}
                    </button>
                  ))}
                  {filteredItemNames.length === 0 && (
                    <p className="text-sm text-[var(--text-muted)]">Ingen produkter funnet</p>
                  )}
                </div>
              )}

              {/* Price chart */}
              {selectedItem && priceTrackingData.chartData.length > 0 ? (
                <>
                  <div className="mb-4 flex items-center gap-4">
                    <button
                      onClick={() => {
                        setSelectedItem(null);
                        setPriceSearchQuery("");
                      }}
                      className="text-xs text-[var(--accent-primary)] hover:underline"
                    >
                      ← Tilbake
                    </button>
                    <span className="text-sm font-medium capitalize text-[var(--text-primary)]">
                      {selectedItem}
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={priceTrackingData.chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => `${v} kr`}
                      />
                      <Tooltip content={<PriceTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="pris"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "#6366f1" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="mt-3 flex gap-6 text-sm">
                    <div>
                      <span className="text-[var(--text-muted)]">Gj.snittspris: </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {formatCurrency(priceTrackingData.avgPrice)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Antall kjøp: </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {priceTrackingData.count}
                      </span>
                    </div>
                  </div>
                </>
              ) : selectedItem ? (
                <div className="py-6 text-center">
                  <button
                    onClick={() => {
                      setSelectedItem(null);
                      setPriceSearchQuery("");
                    }}
                    className="mb-2 text-xs text-[var(--accent-primary)] hover:underline"
                  >
                    ← Tilbake
                  </button>
                  <p className="text-sm text-[var(--text-muted)]">
                    Ingen prishistorikk for &ldquo;{selectedItem}&rdquo;
                  </p>
                </div>
              ) : null}
            </CardBody>
          </Card>

          {/* ─── Summary Stats (existing) ─── */}
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
