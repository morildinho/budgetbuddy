"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Budget,
  BudgetUpdate,
  BudgetEntry,
  BudgetEntryInsert,
  BudgetEntryUpdate,
  BudgetStats,
} from "@/types/database";

interface UseBudgetOptions {
  month?: string; // YYYY-MM-DD format
}

interface UseBudgetReturn {
  budget: Budget | null;
  entries: BudgetEntry[];
  loading: boolean;
  error: string | null;
  stats: BudgetStats;

  // Budget operations
  getOrCreateBudget: (month: string) => Promise<Budget | null>;
  updateBudget: (updates: BudgetUpdate) => Promise<Budget | null>;

  // Entry operations
  createEntry: (entry: Omit<BudgetEntryInsert, "budget_id">) => Promise<BudgetEntry | null>;
  updateEntry: (id: string, updates: BudgetEntryUpdate) => Promise<BudgetEntry | null>;
  deleteEntry: (id: string) => Promise<boolean>;

  // Recurring entries
  copyRecurringEntries: (fromMonth: string, toMonth: string) => Promise<boolean>;

  // Navigation
  navigateMonth: (direction: "prev" | "next") => void;
  currentMonth: string;
  setCurrentMonth: (month: string) => void;
}

// Helper to get first day of month in YYYY-MM-DD format
function getMonthStart(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

// Helper to get current month
function getCurrentMonth(): string {
  return getMonthStart(new Date());
}

export function useBudget(options: UseBudgetOptions = {}): UseBudgetReturn {
  const [currentMonth, setCurrentMonth] = useState(options.month || getCurrentMonth());
  const [budget, setBudget] = useState<Budget | null>(null);
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Calculate stats from entries
  const stats = useMemo((): BudgetStats => {
    const totalFixedExpenses = entries
      .filter((e) => e.entry_type === "fixed_expense")
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const totalVariableExpenses = entries
      .filter((e) => e.entry_type === "variable_expense")
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const totalLoans = entries
      .filter((e) => e.entry_type === "loan")
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const totalIncome = entries
      .filter((e) => e.entry_type === "income")
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const balance = totalIncome - (totalFixedExpenses + totalVariableExpenses + totalLoans);

    return {
      totalFixedExpenses,
      totalVariableExpenses,
      totalLoans,
      totalIncome,
      balance,
    };
  }, [entries]);

  // Fetch budget and entries for current month
  const fetchBudget = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: budgetData, error: budgetError } = await supabase
        .from("budgets")
        .select(
          `
          *,
          entries:budget_entries(*)
        `
        )
        .eq("month", currentMonth)
        .single();

      if (budgetError && budgetError.code !== "PGRST116") {
        // PGRST116 = no rows returned, which is OK
        throw budgetError;
      }

      if (budgetData) {
        setBudget(budgetData);
        // Sort entries by sort_order
        const sortedEntries = (budgetData.entries || []).sort(
          (a: BudgetEntry, b: BudgetEntry) => a.sort_order - b.sort_order
        );
        setEntries(sortedEntries);
      } else {
        setBudget(null);
        setEntries([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kunne ikke hente budsjett";
      setError(message);
      console.error("Error fetching budget:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, currentMonth]);

  // Get or create budget for a month
  const getOrCreateBudget = useCallback(
    async (month: string): Promise<Budget | null> => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("Du må være logget inn");
        }

        // Try to get existing budget
        const { data: existing } = await supabase
          .from("budgets")
          .select("*")
          .eq("user_id", user.id)
          .eq("month", month)
          .single();

        if (existing) {
          return existing;
        }

        // Create new budget
        const { data: newBudget, error: insertError } = await supabase
          .from("budgets")
          .insert({
            user_id: user.id,
            month: month,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setBudget(newBudget);
        return newBudget;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Kunne ikke opprette budsjett";
        setError(message);
        console.error("Error creating budget:", err);
        return null;
      }
    },
    [supabase]
  );

  // Update budget
  const updateBudget = useCallback(
    async (updates: BudgetUpdate): Promise<Budget | null> => {
      if (!budget) return null;

      try {
        const { data, error: updateError } = await supabase
          .from("budgets")
          .update(updates)
          .eq("id", budget.id)
          .select()
          .single();

        if (updateError) throw updateError;

        setBudget(data);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Kunne ikke oppdatere budsjett";
        setError(message);
        console.error("Error updating budget:", err);
        return null;
      }
    },
    [supabase, budget]
  );

  // Create entry
  const createEntry = useCallback(
    async (entryData: Omit<BudgetEntryInsert, "budget_id">): Promise<BudgetEntry | null> => {
      try {
        // Ensure budget exists
        let currentBudget = budget;
        if (!currentBudget) {
          currentBudget = await getOrCreateBudget(currentMonth);
          if (!currentBudget) return null;
        }

        // Get max sort_order for this entry type
        const maxSortOrder = entries
          .filter((e) => e.entry_type === entryData.entry_type)
          .reduce((max, e) => Math.max(max, e.sort_order), -1);

        const { data, error: insertError } = await supabase
          .from("budget_entries")
          .insert({
            ...entryData,
            budget_id: currentBudget.id,
            sort_order: maxSortOrder + 1,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Add to local state
        setEntries((prev) => [...prev, data]);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Kunne ikke legge til post";
        setError(message);
        console.error("Error creating entry:", err);
        return null;
      }
    },
    [supabase, budget, currentMonth, getOrCreateBudget, entries]
  );

  // Update entry
  const updateEntry = useCallback(
    async (id: string, updates: BudgetEntryUpdate): Promise<BudgetEntry | null> => {
      try {
        const { data, error: updateError } = await supabase
          .from("budget_entries")
          .update(updates)
          .eq("id", id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Update local state
        setEntries((prev) => prev.map((e) => (e.id === id ? data : e)));
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Kunne ikke oppdatere post";
        setError(message);
        console.error("Error updating entry:", err);
        return null;
      }
    },
    [supabase]
  );

  // Delete entry
  const deleteEntry = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase.from("budget_entries").delete().eq("id", id);

        if (deleteError) throw deleteError;

        // Remove from local state
        setEntries((prev) => prev.filter((e) => e.id !== id));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Kunne ikke slette post";
        setError(message);
        console.error("Error deleting entry:", err);
        return false;
      }
    },
    [supabase]
  );

  // Copy recurring entries from one month to another
  const copyRecurringEntries = useCallback(
    async (fromMonth: string, toMonth: string): Promise<boolean> => {
      try {
        // Get source budget with entries
        const { data: sourceBudget, error: sourceError } = await supabase
          .from("budgets")
          .select(
            `
            *,
            entries:budget_entries(*)
          `
          )
          .eq("month", fromMonth)
          .single();

        if (sourceError && sourceError.code !== "PGRST116") {
          throw sourceError;
        }

        if (!sourceBudget || !sourceBudget.entries?.length) {
          console.log("No source budget or entries found for copying");
          return false;
        }

        // Filter recurring entries (fixed expenses and loans are typically recurring)
        const recurringEntries = sourceBudget.entries.filter(
          (e: BudgetEntry) =>
            e.is_recurring || e.entry_type === "fixed_expense" || e.entry_type === "loan"
        );

        if (recurringEntries.length === 0) {
          return true; // Nothing to copy
        }

        // Ensure target budget exists
        const targetBudget = await getOrCreateBudget(toMonth);
        if (!targetBudget) return false;

        // Create copies of recurring entries
        const entriesToInsert = recurringEntries.map((e: BudgetEntry) => ({
          budget_id: targetBudget.id,
          entry_type: e.entry_type,
          description: e.description,
          amount: e.amount,
          is_recurring: true,
          sort_order: e.sort_order,
        }));

        const { error: insertError } = await supabase
          .from("budget_entries")
          .insert(entriesToInsert);

        if (insertError) throw insertError;

        // Refresh if we're viewing the target month
        if (toMonth === currentMonth) {
          await fetchBudget();
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Kunne ikke kopiere poster";
        setError(message);
        console.error("Error copying entries:", err);
        return false;
      }
    },
    [supabase, currentMonth, getOrCreateBudget, fetchBudget]
  );

  // Navigate to previous or next month
  const navigateMonth = useCallback(
    (direction: "prev" | "next") => {
      const [year, month] = currentMonth.split("-").map(Number);
      const date = new Date(year, month - 1 + (direction === "next" ? 1 : -1), 1);
      setCurrentMonth(getMonthStart(date));
    },
    [currentMonth]
  );

  // Fetch on mount and when month changes
  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  return {
    budget,
    entries,
    loading,
    error,
    stats,
    getOrCreateBudget,
    updateBudget,
    createEntry,
    updateEntry,
    deleteEntry,
    copyRecurringEntries,
    navigateMonth,
    currentMonth,
    setCurrentMonth,
  };
}

// Hook for yearly overview data
export function useYearlyBudgets(year?: number) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const currentYear = year || new Date().getFullYear();

  const fetchYearlyBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;

      const { data, error: fetchError } = await supabase
        .from("budgets")
        .select(
          `
          *,
          entries:budget_entries(*)
        `
        )
        .gte("month", startDate)
        .lte("month", endDate)
        .order("month", { ascending: true });

      if (fetchError) throw fetchError;

      setBudgets(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kunne ikke hente årsdata";
      setError(message);
      console.error("Error fetching yearly budgets:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, currentYear]);

  // Calculate monthly stats for charts
  const monthlyStats = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthNum = String(i + 1).padStart(2, "0");
      const monthKey = `${currentYear}-${monthNum}-01`;
      const budget = budgets.find((b) => b.month === monthKey);
      const entries = budget?.entries || [];

      const income = entries
        .filter((e) => e.entry_type === "income")
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const expenses = entries
        .filter((e) => e.entry_type !== "income")
        .reduce((sum, e) => sum + Number(e.amount), 0);

      return {
        month: new Date(currentYear, i).toLocaleDateString("no-NO", { month: "short" }),
        monthKey,
        income,
        expenses,
        balance: income - expenses,
      };
    });

    return months;
  }, [budgets, currentYear]);

  useEffect(() => {
    fetchYearlyBudgets();
  }, [fetchYearlyBudgets]);

  return {
    budgets,
    monthlyStats,
    loading,
    error,
    refetch: fetchYearlyBudgets,
  };
}
