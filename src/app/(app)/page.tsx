"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  Landmark,
  LayoutGrid,
  Loader2,
  MessageSquare,
  PieChart,
  Receipt,
  Settings2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card, CardBody, CardHeader, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useReceipts } from "@/hooks/useReceipts";
import { useBankAccounts } from "@/hooks/useBankTransactions";
import { usePortfolio } from "@/hooks/usePortfolio";
import { usePermissions } from "@/hooks/usePermissions";
import type { BudgetEntryType, BankTransaction } from "@/types/database";

type WidgetId =
  | "cashflow"
  | "budgetForecast"
  | "accountBalances"
  | "portfolio"
  | "recentTransactions"
  | "receipts"
  | "topCategories";

interface WidgetDefinition {
  id: WidgetId;
  title: string;
  description: string;
  permission?: "receipts" | "transactions" | "budget" | "analytics" | "portfolio";
}

interface BudgetMonthSummary {
  key: string;
  label: string;
  income: number;
  expenses: number;
  net: number;
  hasBudget: boolean;
}

interface CategorySummary {
  name: string;
  amount: number;
  color: string;
}

const STORAGE_KEY = "budgetbuddy.overview.widgets.v1";
const ACCOUNT_ORDER_STORAGE_KEY = "budgetbuddy.overview.accountOrder.v1";

const WIDGETS: WidgetDefinition[] = [
  {
    id: "cashflow",
    title: "Cashflow denne måneden",
    description: "Inntekter, utgifter og netto basert på banktransaksjoner.",
    permission: "transactions",
  },
  {
    id: "budgetForecast",
    title: "Budsjett nå + 3 mnd",
    description: "Planlagt inntekt, utgift og differanse for fire måneder.",
    permission: "budget",
  },
  {
    id: "accountBalances",
    title: "Kontobeholdning",
    description: "Total saldo og saldo per SpareBank1-konto.",
    permission: "transactions",
  },
  {
    id: "portfolio",
    title: "Portefølje",
    description: "Total verdi, utvikling og største beholdninger.",
    permission: "portfolio",
  },
  {
    id: "recentTransactions",
    title: "Siste transaksjoner",
    description: "De siste banktransaksjonene dine.",
    permission: "transactions",
  },
  {
    id: "receipts",
    title: "Kvitteringer",
    description: "Nøkkeltall og siste kvitteringer.",
    permission: "receipts",
  },
  {
    id: "topCategories",
    title: "Topp kategorier",
    description: "Største vare-/kvitteringskategorier.",
    permission: "receipts",
  },
];

const DEFAULT_WIDGETS: WidgetId[] = [
  "cashflow",
  "budgetForecast",
  "accountBalances",
  "portfolio",
  "recentTransactions",
  "receipts",
  "topCategories",
];

const NO_ACCESS = {
  overview: false,
  receipts: false,
  transactions: false,
  budget: false,
  analytics: false,
  portfolio: false,
};

function getMonthStart(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("no-NO", {
    month: "short",
    year: "numeric",
  });
}

function getFourMonthKeys() {
  const now = new Date();
  return Array.from({ length: 4 }, (_, offset) => {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return getMonthStart(date);
  });
}

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

function normalizeCategory(category: unknown): { name?: string; color?: string } | null {
  if (!category) return null;
  if (Array.isArray(category)) return normalizeCategory(category[0]);
  if (typeof category === "object") return category as { name?: string; color?: string };
  return null;
}

function widgetIsAllowed(widget: WidgetDefinition, canView: typeof NO_ACCESS, isOwner: boolean) {
  if (isOwner) return true;
  if (!widget.permission) return true;
  return canView[widget.permission] === true;
}

export default function DashboardPage() {
  const { receipts, loading: receiptsLoading, stats } = useReceipts({ limit: 5 });
  const { accounts, loading: accountsLoading } = useBankAccounts();
  const { assets, loading: portfolioLoading } = usePortfolio();
  const { canView, isOwner, loading: permissionsLoading } = usePermissions();
  const [customizing, setCustomizing] = useState(false);
  const [enabledWidgets, setEnabledWidgets] = useState<WidgetId[]>(() => {
    if (typeof window === "undefined") return DEFAULT_WIDGETS;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_WIDGETS;
    try {
      const parsed = JSON.parse(stored) as unknown;
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((id): id is WidgetId => WIDGETS.some((widget) => widget.id === id));
        return valid.length > 0 ? valid : DEFAULT_WIDGETS;
      }
    } catch {
      return DEFAULT_WIDGETS;
    }
    return DEFAULT_WIDGETS;
  });
  const [budgetForecast, setBudgetForecast] = useState<BudgetMonthSummary[]>([]);
  const [budgetLoading, setBudgetLoading] = useState(true);
  const [monthTransactions, setMonthTransactions] = useState<BankTransaction[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<BankTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [topCategories, setTopCategories] = useState<CategorySummary[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [accountOrder, setAccountOrder] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = window.localStorage.getItem(ACCOUNT_ORDER_STORAGE_KEY);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored) as unknown;
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
    } catch {
      return [];
    }
  });

  const effectiveCanView = permissionsLoading ? NO_ACCESS : canView;
  const availableWidgets = useMemo(
    () => WIDGETS.filter((widget) => widgetIsAllowed(widget, effectiveCanView, isOwner)),
    [effectiveCanView, isOwner]
  );

  const visibleWidgets = useMemo(() => {
    const availableById = new Map(availableWidgets.map((widget) => [widget.id, widget]));
    const ordered = enabledWidgets
      .map((id) => availableById.get(id))
      .filter((widget): widget is WidgetDefinition => Boolean(widget));

    // Keep the top row predictable: cashflow left, account balances right.
    // The rest still follows the user's chosen order.
    const topRow: WidgetId[] = ["cashflow", "accountBalances"];
    return [
      ...topRow.map((id) => ordered.find((widget) => widget.id === id)).filter((widget): widget is WidgetDefinition => Boolean(widget)),
      ...ordered.filter((widget) => !topRow.includes(widget.id)),
    ];
  }, [availableWidgets, enabledWidgets]);

  const customizerWidgets = useMemo(() => {
    const availableById = new Map(availableWidgets.map((widget) => [widget.id, widget]));
    const enabled = enabledWidgets
      .map((id) => availableById.get(id))
      .filter((widget): widget is WidgetDefinition => Boolean(widget));
    const disabled = availableWidgets.filter((widget) => !enabledWidgets.includes(widget.id));
    return [...enabled, ...disabled];
  }, [availableWidgets, enabledWidgets]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(enabledWidgets));
  }, [enabledWidgets]);

  useEffect(() => {
    if (accountOrder.length > 0) {
      window.localStorage.setItem(ACCOUNT_ORDER_STORAGE_KEY, JSON.stringify(accountOrder));
    }
  }, [accountOrder]);

  useEffect(() => {
    if (accounts.length === 0) return;
    window.setTimeout(() => {
      setAccountOrder((prev) => {
        const accountIds = accounts.map((account) => account.id);
        const orderedExisting = prev.filter((id) => accountIds.includes(id));
        const newIds = accountIds.filter((id) => !orderedExisting.includes(id));
        const next = [...orderedExisting, ...newIds];
        return next.join("|") === prev.join("|") ? prev : next;
      });
    }, 0);
  }, [accounts]);

  useEffect(() => {
    if (!isOwner && !effectiveCanView.budget) {
      window.setTimeout(() => {
        setBudgetForecast([]);
        setBudgetLoading(false);
      }, 0);
      return;
    }

    const fetchBudgetForecast = async () => {
      setBudgetLoading(true);
      const supabase = createClient();
      const months = getFourMonthKeys();
      const { data, error } = await supabase
        .from("budgets")
        .select("month, entries:budget_entries(entry_type, amount)")
        .in("month", months);

      if (error) {
        console.error("Error fetching budget forecast:", error);
        setBudgetForecast([]);
        setBudgetLoading(false);
        return;
      }

      const byMonth = new Map<string, { entries?: { entry_type: BudgetEntryType; amount: number }[] }>();
      for (const budget of data || []) {
        byMonth.set(String(budget.month), budget as { entries?: { entry_type: BudgetEntryType; amount: number }[] });
      }

      setBudgetForecast(
        months.map((month) => {
          const entries = byMonth.get(month)?.entries || [];
          const income = entries
            .filter((entry) => entry.entry_type === "income")
            .reduce((sum, entry) => sum + Number(entry.amount), 0);
          const expenses = entries
            .filter((entry) => entry.entry_type !== "income")
            .reduce((sum, entry) => sum + Number(entry.amount), 0);
          return {
            key: month,
            label: getMonthLabel(month),
            income,
            expenses,
            net: income - expenses,
            hasBudget: entries.length > 0,
          };
        })
      );
      setBudgetLoading(false);
    };

    fetchBudgetForecast();
  }, [effectiveCanView.budget, isOwner]);

  useEffect(() => {
    if (!isOwner && !effectiveCanView.transactions) {
      window.setTimeout(() => {
        setMonthTransactions([]);
        setRecentTransactions([]);
        setTransactionsLoading(false);
      }, 0);
      return;
    }

    const fetchTransactions = async () => {
      setTransactionsLoading(true);
      const supabase = createClient();
      const { startDate, endDate } = getCurrentMonthRange();
      const [monthResult, recentResult] = await Promise.all([
        supabase
          .from("bank_transactions")
          .select("*")
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date", { ascending: false })
          .limit(500),
        supabase
          .from("bank_transactions")
          .select("*")
          .order("date", { ascending: false })
          .limit(8),
      ]);

      if (monthResult.error) console.error("Error fetching month transactions:", monthResult.error);
      if (recentResult.error) console.error("Error fetching recent transactions:", recentResult.error);
      setMonthTransactions((monthResult.data || []) as BankTransaction[]);
      setRecentTransactions((recentResult.data || []) as BankTransaction[]);
      setTransactionsLoading(false);
    };

    fetchTransactions();
  }, [effectiveCanView.transactions, isOwner]);

  useEffect(() => {
    if (!isOwner && !effectiveCanView.receipts) {
      window.setTimeout(() => {
        setTopCategories([]);
        setCategoriesLoading(false);
      }, 0);
      return;
    }

    const fetchTopCategories = async () => {
      setCategoriesLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("receipt_items")
        .select("total_price, category:categories(name, color)")
        .limit(1000);

      if (error) {
        console.error("Error fetching item categories:", error);
        setTopCategories([]);
        setCategoriesLoading(false);
        return;
      }

      const totals = new Map<string, CategorySummary>();
      for (const item of data || []) {
        const category = normalizeCategory(item.category);
        const name = category?.name || "Ukategorisert";
        const current = totals.get(name) || { name, amount: 0, color: category?.color || "#6b7280" };
        current.amount += Number(item.total_price) || 0;
        totals.set(name, current);
      }

      setTopCategories(Array.from(totals.values()).sort((a, b) => b.amount - a.amount).slice(0, 6));
      setCategoriesLoading(false);
    };

    fetchTopCategories();
  }, [effectiveCanView.receipts, isOwner]);

  const monthIncome = monthTransactions
    .filter((txn) => txn.amount > 0)
    .reduce((sum, txn) => sum + Number(txn.amount), 0);
  const monthExpenses = monthTransactions
    .filter((txn) => txn.amount < 0)
    .reduce((sum, txn) => sum + Math.abs(Number(txn.amount)), 0);
  const monthNet = monthIncome - monthExpenses;
  const totalBalance = accounts.reduce((sum, account) => sum + (account.balance ?? 0), 0);
  const orderedAccounts = useMemo(() => {
    if (accounts.length === 0) return [];
    const order = accountOrder.length > 0 ? accountOrder : accounts.map((account) => account.id);
    return [...accounts].sort((a, b) => {
      const aIndex = order.indexOf(a.id);
      const bIndex = order.indexOf(b.id);
      const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
      return safeA - safeB;
    });
  }, [accounts, accountOrder]);
  const portfolioValue = assets.reduce((sum, asset) => sum + (asset.currentValueNok ?? 0), 0);
  const portfolioGainLoss = assets.reduce((sum, asset) => sum + (asset.gainLoss ?? 0), 0);
  const portfolioNotes = assets
    .filter((asset) => asset.notes?.trim())
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 3);
  const portfolioByType = assets.reduce<Record<string, number>>((acc, asset) => {
    acc[asset.asset_type] = (acc[asset.asset_type] || 0) + (asset.currentValueNok ?? 0);
    return acc;
  }, {});

  const pageLoading = permissionsLoading || receiptsLoading;

  const toggleWidget = (id: WidgetId) => {
    setEnabledWidgets((prev) =>
      prev.includes(id) ? prev.filter((widgetId) => widgetId !== id) : [...prev, id]
    );
  };

  const moveWidget = (id: WidgetId, direction: "up" | "down") => {
    setEnabledWidgets((prev) => {
      const index = prev.indexOf(id);
      if (index === -1) return prev;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const moveAccount = (accountId: string, direction: "up" | "down") => {
    setAccountOrder((prev) => {
      const currentOrder = prev.length > 0 ? prev : accounts.map((account) => account.id);
      const index = currentOrder.indexOf(accountId);
      if (index === -1) return currentOrder;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= currentOrder.length) return currentOrder;
      const next = [...currentOrder];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  if (pageLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-24 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] lg:text-3xl">Oversikt</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Din personlige økonomiske cockpit — budsjett, kontoer, transaksjoner og portefølje.
          </p>
        </div>
        <Button variant="outline" onClick={() => setCustomizing((value) => !value)}>
          <Settings2 className="h-4 w-4" />
          Tilpass oversikt
        </Button>
      </div>

      {customizing && (
        <Card className="mb-6 border-[var(--accent-primary)]/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-[var(--accent-primary)]" />
              <h2 className="font-semibold text-[var(--text-primary)]">Velg hva du vil se</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 lg:grid-cols-2">
              {customizerWidgets.map((widget) => {
                const enabled = enabledWidgets.includes(widget.id);
                return (
                  <div
                    key={widget.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border-primary)] p-3"
                  >
                    <button
                      onClick={() => toggleWidget(widget.id)}
                      className="flex flex-1 items-start gap-3 text-left"
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${
                          enabled
                            ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white"
                            : "border-[var(--border-primary)]"
                        }`}
                      >
                        {enabled && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-[var(--text-primary)]">{widget.title}</span>
                        <span className="block text-xs text-[var(--text-muted)]">{widget.description}</span>
                      </span>
                    </button>
                    {enabled && !["cashflow", "accountBalances"].includes(widget.id) && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => moveWidget(widget.id, "up")}
                          className="rounded border border-[var(--border-primary)] px-2 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
                        >
                          Opp
                        </button>
                        <button
                          onClick={() => moveWidget(widget.id, "down")}
                          className="rounded border border-[var(--border-primary)] px-2 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
                        >
                          Ned
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {visibleWidgets.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="Ingen widgets valgt"
          description="Klikk på Tilpass oversikt og velg minst én widget."
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {visibleWidgets.map((widget) => {
            if (widget.id === "cashflow") {
              return (
                <Card key={widget.id} className="flex h-fit flex-col xl:col-span-2 xl:h-[22rem]">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-[var(--accent-primary)]" />
                      <h2 className="font-semibold text-[var(--text-primary)]">Cashflow denne måneden</h2>
                    </div>
                  </CardHeader>
                  <CardBody className="flex flex-1 items-center">
                    {transactionsLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-primary)]" />
                    ) : (
                      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
                        <StatCard
                          title="Inntekt"
                          value={formatCurrency(monthIncome)}
                          change="Banktransaksjoner"
                          changeType="positive"
                          icon={<ArrowUpRight className="h-5 w-5 text-[var(--accent-success)]" />}
                        />
                        <StatCard
                          title="Utgifter"
                          value={formatCurrency(monthExpenses)}
                          change="Denne måneden"
                          changeType="negative"
                          icon={<ArrowDownLeft className="h-5 w-5 text-[var(--accent-danger)]" />}
                        />
                        <StatCard
                          title="Netto"
                          value={formatCurrency(monthNet)}
                          change={monthNet >= 0 ? "Pluss" : "Minus"}
                          changeType={monthNet >= 0 ? "positive" : "negative"}
                          icon={<TrendingUp className="h-5 w-5 text-[var(--accent-primary)]" />}
                        />
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            }

            if (widget.id === "budgetForecast") {
              return (
                <Card key={widget.id} className="h-fit xl:col-span-2">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-[var(--accent-primary)]" />
                        <h2 className="font-semibold text-[var(--text-primary)]">Budsjett nå + 3 måneder</h2>
                      </div>
                      <Link href="/budget" className="text-xs text-[var(--accent-primary)] hover:underline">
                        Åpne budsjett
                      </Link>
                    </div>
                  </CardHeader>
                  <CardBody>
                    {budgetLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-primary)]" />
                    ) : budgetForecast.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)]">Ingen budsjettdata ennå.</p>
                    ) : (
                      <div className="max-h-[26rem] overflow-auto pr-1">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[var(--border-primary)] text-left text-xs text-[var(--text-muted)]">
                              <th className="py-2 font-medium">Måned</th>
                              <th className="py-2 text-right font-medium">Inntekt</th>
                              <th className="py-2 text-right font-medium">Utgift</th>
                              <th className="py-2 text-right font-medium">Netto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {budgetForecast.map((month) => (
                              <tr key={month.key} className="border-b border-[var(--border-primary)]/60 last:border-0">
                                <td className="py-3 text-[var(--text-primary)]">
                                  <div className="font-medium capitalize">{month.label}</div>
                                  {!month.hasBudget && <div className="text-xs text-[var(--text-muted)]">Ikke planlagt</div>}
                                </td>
                                <td className="py-3 text-right text-[var(--accent-success)]">{formatCurrency(month.income)}</td>
                                <td className="py-3 text-right text-[var(--accent-danger)]">{formatCurrency(month.expenses)}</td>
                                <td className={`py-3 text-right font-semibold ${month.net >= 0 ? "text-[var(--accent-success)]" : "text-[var(--accent-danger)]"}`}>
                                  {formatCurrency(month.net)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            }

            if (widget.id === "accountBalances") {
              return (
                <Card key={widget.id} className="flex h-fit flex-col overflow-hidden xl:h-[22rem]">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Landmark className="h-5 w-5 text-[var(--accent-primary)]" />
                      <h2 className="font-semibold text-[var(--text-primary)]">Kontobeholdning</h2>
                    </div>
                  </CardHeader>
                  <CardBody className="min-h-0 flex-1 overflow-hidden">
                    {accountsLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-primary)]" />
                    ) : accounts.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)]">Ingen kontoer hentet ennå.</p>
                    ) : (
                      <div className="flex h-full min-h-0 flex-col">
                        <div className="mb-4 shrink-0 rounded-xl bg-[var(--accent-primary)]/10 p-4">
                          <p className="text-xs text-[var(--text-muted)]">Total saldo</p>
                          <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(totalBalance)}</p>
                        </div>
                        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                          {orderedAccounts.map((account, index) => (
                            <div key={account.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-primary)] px-3 py-2">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-[var(--text-primary)]">{account.name}</p>
                                {account.accountNumber && <p className="text-xs text-[var(--text-muted)]">•••• {account.accountNumber.slice(-4)}</p>}
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <p className="text-sm font-semibold text-[var(--text-primary)]">{account.balance == null ? "—" : formatCurrency(account.balance)}</p>
                                {customizing && (
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={() => moveAccount(account.id, "up")}
                                      disabled={index === 0}
                                      className="rounded border border-[var(--border-primary)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
                                      aria-label={`Flytt ${account.name} opp`}
                                    >
                                      ↑
                                    </button>
                                    <button
                                      onClick={() => moveAccount(account.id, "down")}
                                      disabled={index === orderedAccounts.length - 1}
                                      className="rounded border border-[var(--border-primary)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
                                      aria-label={`Flytt ${account.name} ned`}
                                    >
                                      ↓
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            }

            if (widget.id === "portfolio") {
              return (
                <Card key={widget.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <PieChart className="h-5 w-5 text-[var(--accent-primary)]" />
                        <h2 className="font-semibold text-[var(--text-primary)]">Portefølje</h2>
                      </div>
                      <Link href="/portfolio" className="text-xs text-[var(--accent-primary)] hover:underline">
                        Åpne
                      </Link>
                    </div>
                  </CardHeader>
                  <CardBody>
                    {portfolioLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-primary)]" />
                    ) : assets.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)]">Ingen portefølje lagt inn ennå.</p>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">Total verdi</p>
                          <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(portfolioValue)}</p>
                          <p className={`text-xs ${portfolioGainLoss >= 0 ? "text-[var(--accent-success)]" : "text-[var(--accent-danger)]"}`}>
                            {portfolioGainLoss >= 0 ? "+" : ""}{formatCurrency(portfolioGainLoss)} estimert gevinst/tap
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {Object.entries(portfolioByType).map(([type, value]) => (
                            <Badge key={type} variant="primary">
                              {type === "crypto" ? "Krypto" : type === "cash" ? "Kontanter" : "Aksjer"}: {formatCurrency(value)}
                            </Badge>
                          ))}
                        </div>
                        <div className="space-y-2">
                          {assets.slice(0, 4).map((asset) => (
                            <div key={asset.id} className="flex items-center justify-between text-sm">
                              <span className="text-[var(--text-primary)]">{asset.symbol}</span>
                              <span className="font-medium text-[var(--text-primary)]">{formatCurrency(asset.currentValueNok ?? 0)}</span>
                            </div>
                          ))}
                        </div>
                        {portfolioNotes.length > 0 && (
                          <div className="border-t border-[var(--border-primary)] pt-3">
                            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
                              <MessageSquare className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                              Delt informasjon
                            </div>
                            <div className="space-y-2">
                              {portfolioNotes.map((asset) => (
                                <div key={asset.id} className="rounded-lg bg-[var(--bg-secondary)] p-2.5">
                                  <p className="text-xs font-medium text-[var(--text-primary)]">{asset.name}</p>
                                  <p className="mt-0.5 line-clamp-3 text-xs text-[var(--text-muted)]">{asset.notes}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            }

            if (widget.id === "recentTransactions") {
              return (
                <Card key={widget.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-[var(--accent-primary)]" />
                        <h2 className="font-semibold text-[var(--text-primary)]">Siste transaksjoner</h2>
                      </div>
                      <Link href="/transactions" className="text-xs text-[var(--accent-primary)] hover:underline">
                        Alle
                      </Link>
                    </div>
                  </CardHeader>
                  <CardBody>
                    {transactionsLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-primary)]" />
                    ) : recentTransactions.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)]">Ingen transaksjoner ennå.</p>
                    ) : (
                      <div className="space-y-3">
                        {recentTransactions.map((txn) => (
                          <div key={txn.id} className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-[var(--text-primary)]">{txn.description}</p>
                              <p className="text-xs text-[var(--text-muted)]">{formatDate(txn.date)}</p>
                            </div>
                            <p className={`shrink-0 text-sm font-semibold ${txn.amount >= 0 ? "text-[var(--accent-success)]" : "text-[var(--accent-danger)]"}`}>
                              {txn.amount >= 0 ? "+" : ""}{formatCurrency(txn.amount)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            }

            if (widget.id === "receipts") {
              return (
                <Card key={widget.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-[var(--accent-primary)]" />
                        <h2 className="font-semibold text-[var(--text-primary)]">Kvitteringer</h2>
                      </div>
                      <Link href="/receipts" className="text-xs text-[var(--accent-primary)] hover:underline">
                        Alle
                      </Link>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <div className="mb-4 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-[var(--bg-secondary)] p-3">
                        <p className="text-xs text-[var(--text-muted)]">Denne måneden</p>
                        <p className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(stats.totalThisMonth)}</p>
                      </div>
                      <div className="rounded-lg bg-[var(--bg-secondary)] p-3">
                        <p className="text-xs text-[var(--text-muted)]">Antall</p>
                        <p className="text-lg font-bold text-[var(--text-primary)]">{stats.receiptCount}</p>
                      </div>
                    </div>
                    {receipts.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)]">Ingen kvitteringer ennå.</p>
                    ) : (
                      <div className="space-y-2">
                        {receipts.slice(0, 5).map((receipt) => (
                          <div key={receipt.id} className="flex items-center justify-between text-sm">
                            <span className="truncate text-[var(--text-primary)]">{receipt.merchant}</span>
                            <span className="shrink-0 font-medium text-[var(--text-primary)]">{formatCurrency(receipt.total_amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            }

            if (widget.id === "topCategories") {
              return (
                <Card key={widget.id}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-[var(--accent-primary)]" />
                      <h2 className="font-semibold text-[var(--text-primary)]">Topp kategorier</h2>
                    </div>
                  </CardHeader>
                  <CardBody>
                    {categoriesLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-primary)]" />
                    ) : topCategories.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)]">Ingen kategoridata ennå.</p>
                    ) : (
                      <div className="space-y-3">
                        {topCategories.map((category) => (
                          <div key={category.name}>
                            <div className="mb-1 flex items-center justify-between text-sm">
                              <span className="text-[var(--text-primary)]">{category.name}</span>
                              <span className="font-medium text-[var(--text-primary)]">{formatCurrency(category.amount)}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, (category.amount / Math.max(topCategories[0].amount, 1)) * 100)}%`,
                                  backgroundColor: category.color,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            }

            return null;
          })}
        </div>
      )}

      <div className="mt-6 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 text-xs text-[var(--text-muted)]">
        Tips: Dette er første versjon av tilpassbar oversikt. Valgene lagres på denne enheten. Senere kan vi flytte dem til kontoen din så de følger deg på tvers av enheter.
      </div>
    </div>
  );
}
