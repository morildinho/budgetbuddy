"use client";

import { useState, useMemo } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatCurrency } from "@/lib/utils";
import { useBudget, useYearlyBudgets } from "@/hooks/useBudgets";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Copy,
  Loader2,
  TrendingUp,
  Wallet,
  Home,
  Car,
  Banknote,
  BarChart3,
  Calendar,
} from "lucide-react";
import type { BudgetEntry, BudgetEntryType } from "@/types/database";

// Entry type configuration with Norwegian labels and icons
const ENTRY_TYPE_CONFIG: Record<
  BudgetEntryType,
  {
    label: string;
    labelPlural: string;
    icon: typeof Home;
    color: string;
  }
> = {
  income: {
    label: "Inntekt",
    labelPlural: "Inntekter",
    icon: Banknote,
    color: "#22c55e", // green
  },
  fixed_expense: {
    label: "Fast utgift",
    labelPlural: "Faste utgifter",
    icon: Home,
    color: "#f59e0b", // amber
  },
  variable_expense: {
    label: "Variabel utgift",
    labelPlural: "Variable utgifter",
    icon: Wallet,
    color: "#3b82f6", // blue
  },
  loan: {
    label: "Lån",
    labelPlural: "Lån",
    icon: Car,
    color: "#ef4444", // red
  },
};

// Month selector options
function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = -6; i <= 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
    const label = date.toLocaleDateString("no-NO", { month: "long", year: "numeric" });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return options;
}

export default function BudgetPage() {
  const [activeTab, setActiveTab] = useState<"monthly" | "yearly">("monthly");
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ description: string; amount: string }>({
    description: "",
    amount: "",
  });
  const [newEntry, setNewEntry] = useState<{
    type: BudgetEntryType;
    description: string;
    amount: string;
  } | null>(null);

  const {
    entries,
    loading,
    error,
    stats,
    createEntry,
    updateEntry,
    deleteEntry,
    copyRecurringEntries,
    navigateMonth,
    currentMonth,
    setCurrentMonth,
  } = useBudget();

  const { monthlyStats, loading: yearlyLoading } = useYearlyBudgets();

  // Group entries by type
  const groupedEntries = useMemo(() => {
    const groups: Record<BudgetEntryType, BudgetEntry[]> = {
      income: [],
      fixed_expense: [],
      variable_expense: [],
      loan: [],
    };

    entries.forEach((entry) => {
      groups[entry.entry_type].push(entry);
    });

    // Sort each group by sort_order
    Object.keys(groups).forEach((key) => {
      groups[key as BudgetEntryType].sort((a, b) => a.sort_order - b.sort_order);
    });

    return groups;
  }, [entries]);

  // Format current month for display
  const currentMonthDisplay = useMemo(() => {
    const [year, month] = currentMonth.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    const formatted = date.toLocaleDateString("no-NO", { month: "long", year: "numeric" });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, [currentMonth]);

  // Get previous month for copy functionality
  const getPreviousMonth = () => {
    const [year, month] = currentMonth.split("-").map(Number);
    const date = new Date(year, month - 2, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
  };

  const handleAddEntry = (type: BudgetEntryType) => {
    setNewEntry({ type, description: "", amount: "" });
    setEditingEntry(null);
  };

  const handleSaveNewEntry = async () => {
    if (!newEntry || !newEntry.description.trim() || !newEntry.amount) return;

    await createEntry({
      entry_type: newEntry.type,
      description: newEntry.description.trim(),
      amount: parseFloat(newEntry.amount),
      is_recurring: newEntry.type === "fixed_expense" || newEntry.type === "loan",
    });

    setNewEntry(null);
  };

  const handleStartEdit = (entry: BudgetEntry) => {
    setEditingEntry(entry.id);
    setEditValues({
      description: entry.description,
      amount: String(entry.amount),
    });
    setNewEntry(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editValues.description.trim() || !editValues.amount) return;

    await updateEntry(id, {
      description: editValues.description.trim(),
      amount: parseFloat(editValues.amount),
    });

    setEditingEntry(null);
  };

  const handleCopyFromPreviousMonth = async () => {
    const previousMonth = getPreviousMonth();
    await copyRecurringEntries(previousMonth, currentMonth);
  };

  // Find max value for yearly chart scaling
  const maxChartValue = useMemo(() => {
    if (!monthlyStats.length) return 10000;
    const values = monthlyStats.flatMap((m) => [m.income, m.expenses]);
    return Math.max(...values) * 1.2 || 10000;
  }, [monthlyStats]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] lg:text-3xl">Budsjett</h1>
        <p className="text-sm text-[var(--text-muted)]">Planlegg og spor inntekter og utgifter</p>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="mb-6 border-[var(--accent-danger)]/30">
          <CardBody className="p-4">
            <p className="text-sm text-[var(--accent-danger)]">{error}</p>
          </CardBody>
        </Card>
      )}

      {/* Tab Selector */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={activeTab === "monthly" ? "primary" : "outline"}
          onClick={() => setActiveTab("monthly")}
        >
          <Calendar className="h-4 w-4" />
          Måned
        </Button>
        <Button
          variant={activeTab === "yearly" ? "primary" : "outline"}
          onClick={() => setActiveTab("yearly")}
        >
          <BarChart3 className="h-4 w-4" />
          År
        </Button>
      </div>

      {activeTab === "monthly" ? (
        <>
          {/* Month Navigation */}
          <Card className="mb-6">
            <CardBody className="p-4">
              <div className="flex items-center justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigateMonth("prev")}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                  <Select
                    value={currentMonth}
                    onChange={(e) => setCurrentMonth(e.target.value)}
                    options={getMonthOptions()}
                    className="w-48"
                  />

                  {entries.length === 0 && (
                    <Button variant="outline" size="sm" onClick={handleCopyFromPreviousMonth}>
                      <Copy className="h-4 w-4" />
                      <span className="hidden sm:inline">Kopier fra forrige</span>
                    </Button>
                  )}
                </div>

                <Button variant="ghost" size="sm" onClick={() => navigateMonth("next")}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Balance Summary */}
          <Card className="mb-6">
            <CardBody className="p-4 lg:p-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <div>
                  <p className="text-xs lg:text-sm text-[var(--text-muted)]">Inntekter</p>
                  <p className="text-lg lg:text-xl font-bold text-[#22c55e]">
                    {formatCurrency(stats.totalIncome)}
                  </p>
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-[var(--text-muted)]">Faste</p>
                  <p className="text-lg lg:text-xl font-bold text-[var(--text-primary)]">
                    {formatCurrency(stats.totalFixedExpenses)}
                  </p>
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-[var(--text-muted)]">Variable</p>
                  <p className="text-lg lg:text-xl font-bold text-[var(--text-primary)]">
                    {formatCurrency(stats.totalVariableExpenses)}
                  </p>
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-[var(--text-muted)]">Lån</p>
                  <p className="text-lg lg:text-xl font-bold text-[var(--text-primary)]">
                    {formatCurrency(stats.totalLoans)}
                  </p>
                </div>
                <div className="col-span-2 lg:col-span-1 border-t lg:border-t-0 lg:border-l border-[var(--border-primary)] pt-4 lg:pt-0 lg:pl-4">
                  <p className="text-xs lg:text-sm text-[var(--text-muted)]">Balanse</p>
                  <p
                    className={`text-xl lg:text-2xl font-bold ${stats.balance >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}
                  >
                    {formatCurrency(stats.balance)}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Entry Sections */}
          <div className="space-y-6">
            {(["income", "fixed_expense", "variable_expense", "loan"] as BudgetEntryType[]).map(
              (type) => (
                <EntrySection
                  key={type}
                  type={type}
                  entries={groupedEntries[type]}
                  config={ENTRY_TYPE_CONFIG[type]}
                  editingEntry={editingEntry}
                  editValues={editValues}
                  setEditValues={setEditValues}
                  newEntry={newEntry?.type === type ? newEntry : null}
                  setNewEntry={setNewEntry}
                  onAddEntry={() => handleAddEntry(type)}
                  onSaveNewEntry={handleSaveNewEntry}
                  onStartEdit={handleStartEdit}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={() => setEditingEntry(null)}
                  onDeleteEntry={deleteEntry}
                />
              )
            )}
          </div>
        </>
      ) : (
        /* Yearly View */
        <div className="space-y-6">
          {yearlyLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
            </div>
          ) : (
            <>
              {/* Year Chart */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-[var(--accent-primary)]" />
                    <h2 className="font-semibold text-[var(--text-primary)]">
                      Månedlig oversikt {new Date().getFullYear()}
                    </h2>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="flex items-end justify-between gap-1 lg:gap-2 h-48 lg:h-64">
                    {monthlyStats.map((month) => (
                      <div key={month.monthKey} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="flex w-full gap-0.5 lg:gap-1 items-end"
                          style={{ height: "160px" }}
                        >
                          {/* Income bar */}
                          <div
                            className="flex-1 rounded-t transition-all duration-300"
                            style={{
                              height: `${(month.income / maxChartValue) * 100}%`,
                              minHeight: month.income > 0 ? "4px" : "0",
                              backgroundColor: "#22c55e",
                              opacity: 0.8,
                            }}
                            title={`Inntekt: ${formatCurrency(month.income)}`}
                          />
                          {/* Expenses bar */}
                          <div
                            className="flex-1 rounded-t transition-all duration-300"
                            style={{
                              height: `${(month.expenses / maxChartValue) * 100}%`,
                              minHeight: month.expenses > 0 ? "4px" : "0",
                              backgroundColor: "#ef4444",
                              opacity: 0.8,
                            }}
                            title={`Utgifter: ${formatCurrency(month.expenses)}`}
                          />
                        </div>
                        <span className="text-[10px] lg:text-xs text-[var(--text-muted)]">
                          {month.month}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded bg-[#22c55e]" />
                      <span className="text-sm text-[var(--text-muted)]">Inntekter</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded bg-[#ef4444]" />
                      <span className="text-sm text-[var(--text-muted)]">Utgifter</span>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Monthly Stats Table */}
              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-[var(--text-primary)]">Detaljert oversikt</h2>
                </CardHeader>
                <CardBody className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[var(--border-primary)]">
                          <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-muted)]">
                            Måned
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-muted)]">
                            Inntekt
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-muted)]">
                            Utgifter
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-[var(--text-muted)]">
                            Balanse
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyStats.map((month) => (
                          <tr
                            key={month.monthKey}
                            className="border-b border-[var(--border-primary)] hover:bg-[var(--bg-card-hover)] cursor-pointer"
                            onClick={() => {
                              setCurrentMonth(month.monthKey);
                              setActiveTab("monthly");
                            }}
                          >
                            <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                              {month.month.charAt(0).toUpperCase() + month.month.slice(1)}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-[#22c55e]">
                              {formatCurrency(month.income)}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-[var(--text-primary)]">
                              {formatCurrency(month.expenses)}
                            </td>
                            <td
                              className={`px-4 py-3 text-right text-sm font-medium ${month.balance >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}
                            >
                              {formatCurrency(month.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Entry Section Component
interface EntrySectionProps {
  type: BudgetEntryType;
  entries: BudgetEntry[];
  config: (typeof ENTRY_TYPE_CONFIG)[BudgetEntryType];
  editingEntry: string | null;
  editValues: { description: string; amount: string };
  setEditValues: (values: { description: string; amount: string }) => void;
  newEntry: { type: BudgetEntryType; description: string; amount: string } | null;
  setNewEntry: (
    entry: { type: BudgetEntryType; description: string; amount: string } | null
  ) => void;
  onAddEntry: () => void;
  onSaveNewEntry: () => void;
  onStartEdit: (entry: BudgetEntry) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDeleteEntry: (id: string) => Promise<boolean>;
}

function EntrySection({
  type,
  entries,
  config,
  editingEntry,
  editValues,
  setEditValues,
  newEntry,
  setNewEntry,
  onAddEntry,
  onSaveNewEntry,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeleteEntry,
}: EntrySectionProps) {
  const Icon = config.icon;
  const total = entries.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${config.color}20` }}
            >
              <Icon className="h-4 w-4" style={{ color: config.color }} />
            </div>
            <h2 className="font-semibold text-[var(--text-primary)]">{config.labelPlural}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-[var(--text-primary)]">
              {formatCurrency(total)}
            </span>
            <Button variant="ghost" size="sm" onClick={onAddEntry}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <div className="divide-y divide-[var(--border-primary)]">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between px-4 lg:px-6 py-2">
              {editingEntry === entry.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    value={editValues.description}
                    onChange={(e) =>
                      setEditValues({ ...editValues, description: e.target.value })
                    }
                    className="flex-1"
                    autoFocus
                  />
                  <Input
                    type="number"
                    value={editValues.amount}
                    onChange={(e) => setEditValues({ ...editValues, amount: e.target.value })}
                    className="w-28 lg:w-32"
                  />
                  <Button variant="ghost" size="sm" onClick={() => onSaveEdit(entry.id)}>
                    <Check className="h-4 w-4 text-[#22c55e]" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onCancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="text-[var(--text-primary)]">{entry.description}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)]">
                      {formatCurrency(Number(entry.amount))}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => onStartEdit(entry)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDeleteEntry(entry.id)}>
                      <Trash2 className="h-3 w-3 text-[#ef4444]" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* New Entry Form */}
          {newEntry && (
            <div className="flex items-center gap-2 px-4 lg:px-6 py-2 bg-[var(--bg-secondary)]">
              <Input
                placeholder="Beskrivelse"
                value={newEntry.description}
                onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                className="flex-1"
                autoFocus
              />
              <Input
                type="number"
                placeholder="Beløp"
                value={newEntry.amount}
                onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                className="w-28 lg:w-32"
              />
              <Button variant="ghost" size="sm" onClick={onSaveNewEntry}>
                <Check className="h-4 w-4 text-[#22c55e]" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setNewEntry(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {entries.length === 0 && !newEntry && (
            <div className="px-4 lg:px-6 py-6 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                Ingen {config.labelPlural.toLowerCase()} lagt til
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={onAddEntry}>
                <Plus className="h-4 w-4" />
                Legg til {config.label.toLowerCase()}
              </Button>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
